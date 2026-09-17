import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, DataSource } from 'typeorm';
import { DiseaseKnowledgeEntry } from '../entities/disease-knowledge.entity';
import { VisionResult } from './vision.service';

export interface KnowledgeLookupResult extends VisionResult {
  source: 'local_kb' | 'gemini_vision' | 'pytorch_fallback' | 'mock';
  recommendation_fr?: string | null;
  recommendation_darija?: string | null;
}

/**
 * DiseaseKnowledgeService — Cerveau d'apprentissage de ZirIA Sentinel.
 *
 * Gère la base de connaissances locale : lookup Tier-1 et entraînement
 * automatique depuis les réponses Gemini (confiance >= 85%).
 *
 * Algorithme de priorité :
 *   score = hit_count * avg_confidence (+ bonus x2 si is_verified)
 */
@Injectable()
export class DiseaseKnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(DiseaseKnowledgeService.name);

  /** Seuil de confiance minimum pour entraîner la KB depuis Gemini */
  private readonly TRAIN_CONFIDENCE_THRESHOLD = 0.85;

  /** Seuil de confiance minimum pour servir depuis la KB locale (Tier 1) */
  private readonly SERVE_CONFIDENCE_THRESHOLD = 0.82;

  /** Nombre minimum d'observations avant de servir depuis la KB locale */
  private readonly MIN_HIT_COUNT = 2;

  constructor(
    @InjectRepository(DiseaseKnowledgeEntry)
    private readonly repo: Repository<DiseaseKnowledgeEntry>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.repo.count();
      if (count > 0) {
        this.logger.log(`[KB] Base de connaissances déjà peuplée avec ${count} entrées.`);
        return;
      }

      this.logger.log('[KB] Initialisation : importation des diagnostics existants...');
      
      const pastDetections = await this.dataSource.query(`
        SELECT 
          crop_type, 
          disease_name, 
          MAX(recommendation_fr) as rec_fr, 
          MAX(recommendation_darija) as rec_darija,
          COUNT(*) as hits,
          AVG(CAST(confidence_score AS float)) as avg_conf,
          BOOL_OR(is_expert_validated) as verified
        FROM disease_detections
        WHERE crop_type IS NOT NULL 
          AND crop_type NOT IN ('Non identifiée', 'Culture non spécifiée')
          AND disease_name NOT IN ('Indéterminé — Expertise requise')
        GROUP BY crop_type, disease_name
      `);

      if (pastDetections && pastDetections.length > 0) {
        for (const det of pastDetections) {
          const entry = this.repo.create({
            crop_type: det.crop_type.trim().toLowerCase(),
            disease_name: det.disease_name,
            visual_symptoms: [],
            disease_description: `Maladie détectée historiquement sur la culture de ${det.crop_type}.`,
            recommendation_fr: det.rec_fr || `Traitement recommandé pour ${det.disease_name}.`,
            recommendation_darija: det.rec_darija || `لازم تداوي ${det.disease_name} بسرعة.`,
            hit_count: Math.max(this.MIN_HIT_COUNT, Number(det.hits)),
            avg_confidence: Math.round(Number(det.avg_conf) * 10000) / 10000 || 0.85,
            is_verified: !!det.verified,
            source: det.verified ? 'expert_correction' : 'gemini',
          });
          await this.repo.save(entry);
        }
        this.logger.log(`[KB] ✅ Importation terminée : ${pastDetections.length} maladies importées dans la KB locale.`);
      } else {
        this.logger.log('[KB] Aucun diagnostic historique éligible trouvé.');
      }
    } catch (err) {
      this.logger.error(`[KB] Échec de l'importation initiale : ${err.message}`);
    }
  }

  /**
   * Tier-1 lookup : cherche la maladie la plus probable pour cette culture.
   * Retourne null si aucune entrée fiable n'est trouvée.
   *
   * @param cropType - culture connue (optionnel)
   * @returns résultat local ou null
   */
  async lookup(cropType?: string): Promise<KnowledgeLookupResult | null> {
    if (!cropType || cropType.trim().length < 2) return null;

    try {
      const cropNorm = cropType.trim().toLowerCase();

      // Requête : même culture + seuil de confiance + au moins 2 observations
      const entries = await this.repo.find({
        where: { crop_type: ILike(`%${cropNorm}%`) },
        order: { hit_count: 'DESC', avg_confidence: 'DESC', last_seen_at: 'DESC' },
        take: 5,
      });

      if (entries.length === 0) return null;

      // Score = hit_count × avg_confidence (×2 bonus si expert validé)
      const scored = entries
        .map(e => ({
          entry: e,
          score: e.hit_count * Number(e.avg_confidence) * (e.is_verified ? 2 : 1),
        }))
        .filter(
          s =>
            Number(s.entry.avg_confidence) >= this.SERVE_CONFIDENCE_THRESHOLD &&
            s.entry.hit_count >= this.MIN_HIT_COUNT,
        )
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) return null;

      const best = scored[0].entry;

      this.logger.log(
        `[KB Tier-1] ✅ HIT — ${best.disease_name} pour "${cropType}" ` +
        `(score: ${scored[0].score.toFixed(2)}, hits: ${best.hit_count}, conf: ${(Number(best.avg_confidence) * 100).toFixed(1)}%)`,
      );

      // Incrémenter hit_count en async (non bloquant)
      this.repo.increment({ id: best.id }, 'hit_count', 1).catch(() => null);

      return {
        disease: best.disease_name,
        confidence: Number(best.avg_confidence),
        crop_detected: cropType,
        disease_description: best.disease_description || '',
        visual_symptoms: best.visual_symptoms || [],
        requires_expert_validation: !best.is_verified && Number(best.avg_confidence) < 0.90,
        source: 'local_kb',
        recommendation_fr: best.recommendation_fr,
        recommendation_darija: best.recommendation_darija,
        is_expert_validated: !!best.is_verified,
      };
    } catch (err) {
      this.logger.warn(`[KB] Erreur lookup: ${err.message}`);
      return null;
    }
  }

  /**
   * Tier-1 Offline lookup : version assouplie utilisée quand Gemini est totalement
   * indisponible (quota journalier épuisé sur toutes les clés).
   *
   * Seuils réduits : hit_count >= 1, avg_confidence >= 0.60
   * Priorité : is_verified > hit_count > avg_confidence
   *
   * @param cropType - culture connue (obligatoire)
   */
  async lookupRelaxed(cropType?: string): Promise<KnowledgeLookupResult | null> {
    if (!cropType || cropType.trim().length < 2) return null;

    try {
      const cropNorm = cropType.trim().toLowerCase();

      const entries = await this.repo.find({
        where: { crop_type: ILike(`%${cropNorm}%`) },
        order: { is_verified: 'DESC', hit_count: 'DESC', avg_confidence: 'DESC' },
        take: 10,
      });

      if (entries.length === 0) return null;

      // En mode offline : seuils assouplis
      const OFFLINE_CONF_THRESHOLD = 0.60;
      const eligible = entries.filter(
        e => Number(e.avg_confidence) >= OFFLINE_CONF_THRESHOLD && e.hit_count >= 1,
      );

      if (eligible.length === 0) return null;

      const best = eligible[0];
      this.logger.log(
        `[KB Offline] ✅ HIT RELAXÉ — ${best.disease_name} pour "${cropType}" ` +
        `(conf: ${(Number(best.avg_confidence) * 100).toFixed(1)}%, hits: ${best.hit_count}, verified: ${best.is_verified})`,
      );

      // Toujours marquer requires_expert_validation = true en mode offline
      return {
        disease: best.disease_name,
        confidence: Number(best.avg_confidence),
        crop_detected: cropType,
        disease_description: best.disease_description || '',
        visual_symptoms: best.visual_symptoms || [],
        requires_expert_validation: true,
        source: 'local_kb',
        recommendation_fr: best.recommendation_fr,
        recommendation_darija: best.recommendation_darija,
        is_expert_validated: !!best.is_verified,
      };
    } catch (err) {
      this.logger.warn(`[KB] Erreur lookupRelaxed: ${err.message}`);
      return null;
    }
  }

  /**
   * Tier-1.5 Global lookup : cherche la meilleure entrée SANS filtrer par culture.
   * Utilisé quand le lookup par culture échoue (ex: culture 'Olive' mais KB stockée sous 'non identifiée').
   * Retourne uniquement les entrées expert-vérifiées ou très haute confiance.
   */
  async lookupGlobal(): Promise<KnowledgeLookupResult | null> {
    try {
      // Prendre UNIQUEMENT les entrées vérifiées par expert ou très haute confiance
      const entries = await this.repo.find({
        where: { is_verified: true },
        order: { hit_count: 'DESC', avg_confidence: 'DESC' },
        take: 5,
      });

      if (entries.length === 0) return null;

      const best = entries[0];
      this.logger.log(
        `[KB Global] ✅ HIT GLOBAL (crop-agnostique) — ${best.disease_name} ` +
        `(conf: ${(Number(best.avg_confidence) * 100).toFixed(1)}%, hits: ${best.hit_count})`,
      );

      this.repo.increment({ id: best.id }, 'hit_count', 1).catch(() => null);

      return {
        disease: best.disease_name,
        confidence: Number(best.avg_confidence),
        crop_detected: best.crop_type || 'Non identifiée',
        disease_description: best.disease_description || '',
        visual_symptoms: best.visual_symptoms || [],
        requires_expert_validation: false,
        source: 'local_kb',
        recommendation_fr: best.recommendation_fr,
        recommendation_darija: best.recommendation_darija,
        is_expert_validated: true,
      };
    } catch (err) {
      this.logger.warn(`[KB] Erreur lookupGlobal: ${err.message}`);
      return null;
    }
  }

  /**
   * Tier-0 URL Cache: cherche un diagnostic IDENTIQUE déjà enregistré
   * pour la même URL photo. Retourne null si aucun trouvé ou si le résultat
   * était 'Indéterminé'.
   */
  async lookupByPhotoUrl(photoUrl: string): Promise<KnowledgeLookupResult | null> {
    try {
      const rows = await this.dataSource.query(`
        SELECT disease_name, confidence_score, crop_type,
               recommendation_fr, recommendation_darija, is_expert_validated, expert_comments
        FROM disease_detections
        WHERE photo_url = $1
          AND disease_name != 'Indéterminé — Expertise requise'
          AND confidence_score > 0
        ORDER BY created_at DESC
        LIMIT 1
      `, [photoUrl]);

      if (!rows || rows.length === 0) return null;

      const det = rows[0];
      this.logger.log(
        `[TIER-0 URL Cache] ✅ Même image retrouvée — ${det.disease_name} (conf: ${(Number(det.confidence_score) * 100).toFixed(1)}%)`,
      );

      return {
        disease: det.disease_name,
        confidence: Number(det.confidence_score),
        crop_detected: det.crop_type || 'Non identifiée',
        disease_description: `Diagnostic précédent retrouvé pour cette image.`,
        visual_symptoms: [],
        requires_expert_validation: !det.is_expert_validated,
        source: 'local_kb',
        recommendation_fr: det.recommendation_fr || null,
        recommendation_darija: det.recommendation_darija || null,
        is_expert_validated: !!det.is_expert_validated,
      };
    } catch (err) {
      this.logger.warn(`[KB] Erreur lookupByPhotoUrl: ${err.message}`);
      return null;
    }
  }

  /**
   * Entraînement automatique depuis une réponse Gemini.
   * Appelé en fire-and-forget (sans await) après un appel Gemini réussi.
   *
   * @param result - résultat Gemini
   * @param cropType - culture détectée
   * @param recommendations - recommandations agronomiques (facultatif)
   */
  async trainFromGemini(
    result: VisionResult,
    cropType: string,
    recommendations?: { fr?: string | null; darija?: string | null },
  ): Promise<void> {
    if (result.confidence < this.TRAIN_CONFIDENCE_THRESHOLD) {
      this.logger.debug(
        `[KB] Entraînement ignoré — confiance trop basse: ${(result.confidence * 100).toFixed(1)}%`,
      );
      return;
    }

    try {
      const cropNorm = cropType.trim().toLowerCase();
      const existing = await this.repo.findOne({
        where: {
          crop_type: ILike(`%${cropNorm}%`),
          disease_name: ILike(`%${result.disease.substring(0, 30)}%`),
        },
      });

      if (existing) {
        // Mise à jour — moyenne glissante de la confiance
        const oldAvg = Number(existing.avg_confidence);
        const newAvg = (oldAvg * existing.hit_count + result.confidence) / (existing.hit_count + 1);
        existing.avg_confidence = Math.round(newAvg * 10000) / 10000;
        existing.hit_count += 1;
        existing.visual_symptoms = [
          ...new Set([...(existing.visual_symptoms || []), ...(result.visual_symptoms || [])]),
        ].slice(0, 15); // Max 15 symptômes
        if (result.disease_description && !existing.disease_description) {
          existing.disease_description = result.disease_description;
        }
        if (recommendations?.fr && !existing.recommendation_fr) {
          existing.recommendation_fr = recommendations.fr;
        }
        if (recommendations?.darija && !existing.recommendation_darija) {
          existing.recommendation_darija = recommendations.darija;
        }
        await this.repo.save(existing);
        this.logger.log(
          `[KB] Mise à jour: ${result.disease} (hits: ${existing.hit_count}, conf_moy: ${(newAvg * 100).toFixed(1)}%)`,
        );
      } else {
        // Nouvelle entrée
        const entry = this.repo.create({
          crop_type: cropNorm,
          disease_name: result.disease,
          visual_symptoms: (result.visual_symptoms || []).slice(0, 15),
          disease_description: result.disease_description || null,
          recommendation_fr: recommendations?.fr || null,
          recommendation_darija: recommendations?.darija || null,
          hit_count: 1,
          avg_confidence: Math.round(result.confidence * 10000) / 10000,
          is_verified: false,
          source: 'gemini',
        });
        await this.repo.save(entry);
        this.logger.log(
          `[KB] Nouvelle entrée: ${result.disease} pour "${cropType}" (conf: ${(result.confidence * 100).toFixed(1)}%)`,
        );
      }
    } catch (err) {
      this.logger.warn(`[KB] Erreur entraînement Gemini: ${err.message}`);
    }
  }

  /**
   * Entraînement depuis une correction d'expert agronome.
   * Confiance forcée à 0.95, is_verified = true.
   *
   * @param diseaseName - maladie validée par l'expert
   * @param cropType - culture
   * @param recommendations - recommandations de l'expert (facultatif)
   */
  async trainFromExpert(
    diseaseName: string,
    cropType: string,
    recommendations?: { fr?: string | null; darija?: string | null },
  ): Promise<void> {
    try {
      const cropNorm = cropType.trim().toLowerCase();
      const existing = await this.repo.findOne({
        where: {
          crop_type: ILike(`%${cropNorm}%`),
          disease_name: ILike(`%${diseaseName.substring(0, 30)}%`),
        },
      });

      if (existing) {
        existing.is_verified = true;
        existing.source = 'expert_correction';
        existing.avg_confidence = 0.95;
        existing.hit_count += 1;
        if (recommendations?.fr) existing.recommendation_fr = recommendations.fr;
        if (recommendations?.darija) existing.recommendation_darija = recommendations.darija;
        await this.repo.save(existing);
      } else {
        await this.repo.save(
          this.repo.create({
            crop_type: cropNorm,
            disease_name: diseaseName,
            visual_symptoms: [],
            disease_description: null,
            recommendation_fr: recommendations?.fr || null,
            recommendation_darija: recommendations?.darija || null,
            hit_count: 1,
            avg_confidence: 0.95,
            is_verified: true,
            source: 'expert_correction',
          }),
        );
      }
      this.logger.log(`[KB] Entrée expert vérifiée: ${diseaseName} pour "${cropType}"`);
    } catch (err) {
      this.logger.warn(`[KB] Erreur entraînement expert: ${err.message}`);
    }
  }

  /** Retourne les N meilleures entrées de la KB (pour admin dashboard) */
  async getTopEntries(limit = 20): Promise<DiseaseKnowledgeEntry[]> {
    return this.repo.find({
      order: { hit_count: 'DESC', avg_confidence: 'DESC' },
      take: limit,
    });
  }

  /** Stats globales de la KB */
  async getStats() {
    const total = await this.repo.count();
    const verified = await this.repo.count({ where: { is_verified: true } });
    const highConfidence = await this.repo.count();
    return { total_entries: total, verified_entries: verified, auto_trained: total - verified };
  }
}
