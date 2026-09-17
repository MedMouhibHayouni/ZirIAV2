import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VisionService } from './services/vision.service';
import { ReasoningService } from './services/reasoning.service';
import { PredictiveService, HarvestPrediction } from './services/predictive.service';
import { LogisticsService, LogisticsAlert } from './services/logistics.service';
import { AudioProcessingService, AudioIntentResult } from './services/audio.service';
import { ExpertGateway } from './gateways/expert.gateway';
import { WeatherService } from '../weather/weather.service';
import { DiseaseDetection, DetectionUrgency } from '../disease-detections/entities/disease-detection.entity';
import { NotificationService } from '../notifications/notification.service';
import { User } from '../users/entities/user.entity';
import { NameDictionary } from '../name-dictionary/entities/name-dictionary.entity';
import { ConfigService } from '@nestjs/config';
import { Part } from '@google/generative-ai';
import { GeminiService } from './services/gemini.service';
import { DiseaseKnowledgeService } from './services/disease-knowledge.service';
import { MoreThanOrEqual, IsNull } from 'typeorm';
import { PlantIdentification } from './entities/plant-identification.entity';
import axios from 'axios';

export interface SentinelReport {
  /** ID de l'enregistrement créé en base */
  detection_id: string;

  /** Résultat de la vision IA */
  vision: {
    disease: string;
    confidence: number;
    requires_expert_validation: boolean;
    escalation_message?: string;
  };

  /** Contexte météo au moment de l'analyse */
  weather: {
    temperature_c: number;
    humidity_pct: number;
    wind_speed_kmh: number;
    precipitation_mm: number;
    probability_of_precipitation: number;
  };

  /** Décision agronomique contextuelle */
  decision: {
    urgency: string;
    is_weather_aggravated: boolean;
    recommendation_fr: string;
    recommendation_darija: string;
    actions?: string[];
    explanation_fr?: string;
    explanation_darija?: string;
    recommended_products?: any[];
  };

  /** Alertes logistiques déclenchées */
  logistics_alert: LogisticsAlert;

  /** Source du résultat vision */
  source: 'python_model' | 'mock_stub';

  /** Arabic translated name if resolved */
  disease_name_ar?: string;

  /** Latin translated name if resolved */
  disease_name_lat?: string;

  /** French display name from NameDictionary (falls back to disease key) */
  name_fr?: string;

  /** Darija/Arabic display name from NameDictionary */
  name_ar?: string;

  /** Latin scientific name from NameDictionary */
  name_lat?: string;

  /** V5 HIGH_RISK escalation message */
  escalation_message?: string;
}

/**
 * AiService — Orchestrateur ZirIA Sentinel
 *
 * Pipeline complet d'analyse multimodale :
 * 1. VisionService     → Classifie la maladie (PyTorch)
 * 2. WeatherService    → Récupère les conditions météo GPS
 * 3. ReasoningService  → Croise vision + météo → décision urgentée (Gemini)
 * 4. DiseaseDetection  → Sauvegarde le rapport complet en DB
 * 5. LogisticsService  → Alerte préventive si conditions dangereuses
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly visionService: VisionService,
    private readonly reasoningService: ReasoningService,
    private readonly predictiveService: PredictiveService,
    private readonly logisticsService: LogisticsService,
    private readonly audioService: AudioProcessingService,
    private readonly expertGateway: ExpertGateway,
    private readonly weatherService: WeatherService,
    private readonly notificationService: NotificationService,
    @InjectRepository(DiseaseDetection)
    private readonly detectionRepo: Repository<DiseaseDetection>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PlantIdentification)
    private readonly plantIdRepo: Repository<PlantIdentification>,
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
    private readonly diseaseKnowledgeService: DiseaseKnowledgeService,
    private readonly dataSource: DataSource,
  ) {
    this.logger.log('✅ AiService — Pipeline Sentinel opErationnel (KB + Gemini + PyTorch)');
  }

  /**
   * Diagnostic direct via la chaîne décisionnelle Sentinel V4 (VisionService)
   */
  async diagnoseDirect(imageUrl: string, cropType?: string, customRequestId?: string) {
    return this.visionService.classifyDisease(imageUrl, cropType, customRequestId);
  }

  /**
   * Pipeline principal de détection : analyse d'une image terrain.
   *
   * @param imageUrl   - URL Cloudinary de la photo
   * @param lat        - Latitude GPS du terrain
   * @param lng        - Longitude GPS du terrain
   * @param reporterId - UUID de l'utilisateur (extrait du JWT)
   * @param cropType   - Type de culture pour le raisonnement
   * @param parcelId   - ID de la parcelle liée (optionnel)
   */
  async analyzePlantDisease(
    imageUrl: string,
    lat: number,
    lng: number,
    reporterId: string,
    cropType?: string,
    parcelId?: string,
  ): Promise<SentinelReport> {
    this.logger.log(`=== ZirIA Sentinel Pipeline ===`);
    this.logger.log(`Image: ${imageUrl} | Reporter: ${reporterId} | Culture: ${cropType}`);

    // ─── Résolution automatique du type de culture ────────────────────────────
    // Si l'utilisateur n'a pas sélectionné de culture, on tente de l'inférer
    // depuis ses parcelles pour maximiser les hits du cache local (Tier-1 KB).
    let resolvedCropType = cropType;
    if (!resolvedCropType || resolvedCropType === 'Non identifiée' || resolvedCropType === 'Culture non spécifiée') {
      try {
        const userParcels: { crop_type: string }[] = await this.dataSource.query(
          `SELECT DISTINCT crop_type FROM parcels WHERE owner_id = $1 AND crop_type IS NOT NULL LIMIT 5`,
          [reporterId],
        );
        if (userParcels && userParcels.length > 0) {
          resolvedCropType = userParcels[0].crop_type;
          this.logger.log(`[CROP-RESOLVE] Auto-détecté depuis parcelles: ${resolvedCropType}`);
        }
      } catch (resolveErr) {
        this.logger.warn(`[CROP-RESOLVE] Impossible de résoudre le crop depuis les parcelles: ${resolveErr.message}`);
      }
    }

    // ─── Étape 1 : Vision (pipeline hybride KB → Gemini → PyTorch) ──────────────
    let vision: Awaited<ReturnType<typeof this.visionService.classifyDisease>>;
    try {
      vision = await this.visionService.classifyDisease(imageUrl, resolvedCropType);
    } catch (visionErr) {
      this.logger.error(`[1/5] Vision FAILED: ${visionErr.message}`);
      throw new Error(`Impossible d'analyser l'image. Détail: ${visionErr.message}`);
    }
    const effectiveCropType = resolvedCropType || (vision as any).crop_detected || 'Culture non spécifiée';
    this.logger.log(`[1/5] [${(vision as any).source || 'unknown'}] ${vision.disease} (${(vision.confidence * 100).toFixed(1)}%) | Expert: ${vision.requires_expert_validation}`);

    // ─── Étape 2 : Contexte météo (Open-Meteo) ────────────────────────────────
    const weather = await this.weatherService.getCurrentConditions(lat, lng);
    this.logger.log(`[2/5] Météo: ${weather.temperature_c}°C, H:${weather.humidity_pct}%, V:${weather.wind_speed_kmh}km/h`);

    // ─── Étape 3 : Recommandations agronomiques (Gemini Text) ────────────────
    const isEscalationSentence = (s?: string) => !s || s.includes('sûr') || s.includes('expert') || s.includes('Diagnostic blé');
    const inputDiseaseForReasoning = !isEscalationSentence(vision.disease)
      ? vision.disease
      : ((vision as any).name_fr && !isEscalationSentence((vision as any).name_fr))
      ? (vision as any).name_fr
      : ((vision as any).top3?.[0]?.disease && !isEscalationSentence((vision as any).top3[0].disease))
      ? (vision as any).top3[0].disease
      : `${effectiveCropType} — Maladie foliaire suspectée`;

    const decision = await this.reasoningService.analyze(
      imageUrl,
      inputDiseaseForReasoning,
      vision.confidence,
      weather,
      effectiveCropType,
    );

    const finalDiseaseFr = (!isEscalationSentence(decision.disease_fr) && decision.disease_fr)
      || (!isEscalationSentence((vision as any).name_fr) && (vision as any).name_fr)
      || (!isEscalationSentence(decision.disease) && decision.disease)
      || (!isEscalationSentence(vision.disease) && vision.disease)
      || inputDiseaseForReasoning;

    this.logger.log(`[3/5] Décision: ${finalDiseaseFr} (${(decision.confidence * 100).toFixed(0)}%) | Urgence ${decision.urgency}`);

    // ─── Entraînement KB avec recommandations complètes (async, non bloquant) ─
    // Seulement si Gemini a répondu (pas un résultat local_kb) ET confiance >= 85%
    if ((vision as any).source !== 'local_kb' && vision.confidence >= 0.85) {
      this.diseaseKnowledgeService
        .trainFromGemini(vision, effectiveCropType, {
          fr: decision.recommendation_fr,
          darija: decision.recommendation_darija,
        })
        .catch(e => this.logger.warn(`[KB post-reasoning train] ${e.message}`));
    }

    // ─── Étape 4 : Persistance en base ───────────────────────────────────────
    const detection = this.detectionRepo.create({
      reporter_id: reporterId,
      parcel_id: parcelId,
      lat,
      lng,
      crop_type: effectiveCropType,
      disease_name: finalDiseaseFr,
      confidence_score: decision.confidence || vision.confidence,
      requires_expert_validation: vision.is_expert_validated ? false : vision.requires_expert_validation,
      is_expert_validated: !!vision.is_expert_validated,
      urgency: ((decision.urgency as string) === 'HIGH' || (decision.urgency as string) === 'CRITICAL')
        ? DetectionUrgency.CRITICAL
        : decision.urgency === 'LOW'
        ? DetectionUrgency.LOW
        : DetectionUrgency.MEDIUM,
      recommendation_fr: decision.recommendation_fr,
      recommendation_darija: decision.recommendation_darija,
      photo_url: imageUrl,
      weather_snapshot: {
        temperature_c: weather.temperature_c,
        humidity_pct: weather.humidity_pct,
        wind_speed_kmh: weather.wind_speed_kmh,
        precipitation_mm: weather.precipitation_mm,
        weather_code: weather.weather_code,
      },
    });

    const saved = await this.detectionRepo.save(detection);
    this.logger.log(`[4/5] Rapport sauvegardé: ID = ${saved.id}`);

    // If the farmer has an ACCEPTED relation with an expert, auto-assign the detection
    const relation = await this.dataSource.query(`
      SELECT efr.expert_id, u.expert_type
      FROM expert_farmer_relations efr
      JOIN users u ON u.id = efr.expert_id
      WHERE efr.farmer_id = $1 AND efr.status = 'ACCEPTED'
      LIMIT 1
    `, [reporterId]);
    if (relation.length) {
      await this.dataSource.query(`
        UPDATE disease_detections
        SET assigned_expert_id = $1, required_expert_type = $2, requires_expert_validation = true
        WHERE id = $3
      `, [relation[0].expert_id, relation[0].expert_type, saved.id]);
      saved.assigned_expert_id = relation[0].expert_id;
      saved.required_expert_type = relation[0].expert_type;
      saved.requires_expert_validation = true;
      this.logger.log(`[4/5] Auto-assigné à l'expert ${relation[0].expert_id} (${relation[0].expert_type})`);
    }

    // Diffuser sur WebSocket si le score demande l'avis d'un expert (< 0.75)
    if (vision.requires_expert_validation) {
      const reporter = await this.userRepo.findOne({ where: { id: reporterId } });
      const governorate = reporter?.governorate || 'inconnu';

      this.expertGateway.broadcastToExperts({
        detection_id: saved.id,
        disease: finalDiseaseFr,
        confidence: vision.confidence,
        lat,
        lng,
        urgency: decision.urgency,
        governorate,
      });
    }

    // ─── Étape 5 : Alerte logistique préventive (async non bloquant) ──────────
    const logisticsAlert = await this.logisticsService.runPreventiveCheck(lat, lng, weather);
    this.logger.log(`[5/5] Logistique: ${logisticsAlert.at_risk_count} équipement(s) en zone de risque`);

    // Notification push au rapporteur si urgence CRITICAL
    if (decision.urgency === 'CRITICAL') {
      await this.notificationService.sendPushToUser(reporterId, {
        title: 'Alerte Maladie CRITIQUE Détectée',
        message: `${finalDiseaseFr} détectée (${(vision.confidence * 100).toFixed(0)}%). Action immédiate requise.`,
        payload: {
          type: 'DISEASE_CRITICAL',
          detection_id: saved.id,
          disease: finalDiseaseFr,
        },
      });
    }

    // Auto-upsert dynamic name translations from Gemini Reasoning into the NameDictionary
    if (!isEscalationSentence(finalDiseaseFr) && (decision.disease_ar || decision.disease_lat)) {
      try {
        const nameDictRepo = this.detectionRepo.manager.getRepository(NameDictionary);
        const existing = await nameDictRepo.findOne({ where: { key: finalDiseaseFr } });
        if (!existing) {
          await nameDictRepo.save(nameDictRepo.create({
            key: finalDiseaseFr,
            name_fr: finalDiseaseFr,
            name_ar: decision.disease_ar || finalDiseaseFr,
            name_lat: decision.disease_lat || finalDiseaseFr
          }));
          this.logger.log(`[NameDictionary] Dynamic entry added for: ${finalDiseaseFr}`);
        } else {
          let modified = false;
          if (!existing.name_ar && decision.disease_ar) {
            existing.name_ar = decision.disease_ar;
            modified = true;
          }
          if (!existing.name_lat && decision.disease_lat) {
            existing.name_lat = decision.disease_lat;
            modified = true;
          }
          if (modified) {
            await nameDictRepo.save(existing);
            this.logger.log(`[NameDictionary] Dynamic entry updated for: ${finalDiseaseFr}`);
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to auto-upsert NameDictionary: ${err.message}`);
      }
    }

    // @ts-ignore — escalation_message is V5 HIGH_RISK payload, type will be updated
    return {
      detection_id: saved.id,
      vision: {
        disease: finalDiseaseFr,
        confidence: decision.confidence || vision.confidence,
        requires_expert_validation: vision.requires_expert_validation,
        escalation_message: (vision as any).escalation_message,
      } as any,
      weather: {
        temperature_c: weather.temperature_c,
        humidity_pct: weather.humidity_pct,
        wind_speed_kmh: weather.wind_speed_kmh,
        precipitation_mm: weather.precipitation_mm,
        probability_of_precipitation: weather.probability_of_precipitation ?? 0,
      },
      decision: {
        urgency: decision.urgency,
        is_weather_aggravated: decision.is_weather_aggravated,
        recommendation_fr: decision.recommendation_fr,
        recommendation_darija: decision.recommendation_darija,
        actions: decision.actions,
        explanation_fr: decision.explanation_fr,
        explanation_darija: decision.explanation_darija,
        recommended_products: decision.recommended_products,
      },
      logistics_alert: logisticsAlert,
      source: (vision as any).source || 'gemini_vision',
      disease_name_ar: decision.disease_ar || (vision as any).name_ar || undefined,
      disease_name_lat: decision.disease_lat || (vision as any).name_lat || undefined,
      name_fr: finalDiseaseFr,
      name_ar: decision.disease_ar || (vision as any).name_ar || undefined,
      name_lat: decision.disease_lat || (vision as any).name_lat || undefined,
      escalation_message: (vision as any).escalation_message,
    };
  }

  /**
   * ZirPulse : Analyse un audio en Darija
   */
  async parseAudioIntent(audioUrl: string, lat: number, lng: number, reporterId: string): Promise<AudioIntentResult> {
    return this.audioService.parseAudioIntent(audioUrl, lat, lng, reporterId);
  }

  /**
   * Calcule la date de récolte estimée pour une parcelle (délègue au PredictiveService).
   */
  async calculateHarvestDate(parcelId: string): Promise<HarvestPrediction> {
    const weather = await this.weatherService.getDefaultConditions();
    return this.predictiveService.calculateHarvestDate(parcelId, weather);
  }

  /**
   * Prédiction de rendement rapide (tabulaire — Python non requis).
   */
  predictYield(cropType: string, surfaceHa: number) {
    const BASE_YIELDS: Record<string, number> = {
      'tomate': 40, 'piment': 12, 'piment doux': 15, 'blé dur': 2.5,
      'orge': 2.2, 'olive': 3.5, 'amandier': 2.0, 'sorgho': 3.0,
    };
    const base = BASE_YIELDS[cropType.toLowerCase()] ?? 5.0;
    return {
      crop_type: cropType,
      surface_ha: surfaceHa,
      estimated_yield_tonnes: +(base * surfaceHa).toFixed(2),
      confidence_interval: {
        min: +((base * 0.8) * surfaceHa).toFixed(2),
        max: +((base * 1.2) * surfaceHa).toFixed(2),
      },
      source: 'tabular_model',
    };
  }

  /**
   * Identifies a plant from an uploaded image URL, with IP-based rate limiting for guests.
   */
  async identifyPlant(imageUrl: string, userId?: string, ipAddress?: string): Promise<any> {
    // 1. IP-based rate limiting check for anonymous guests
    if (!userId && ipAddress) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const count = await this.plantIdRepo.count({
        where: {
          ip_address: ipAddress,
          user_id: IsNull(),
          created_at: MoreThanOrEqual(todayStart),
        },
      });

      if (count > 0) {
        return {
          rateLimited: true,
          message_fr: "Votre identification gratuite du jour a été consommée. Revenez demain ou créez un compte gratuit pour continuer !",
          message_ar: "لقد استهلكت هويتك المجانية لهذا اليوم. يرجى العودة غدًا أو إنشاء حساب مجاني للوصول إلى المزيد من الميزات !",
        };
      }
    }

    // 2. Call Gemini with key rotation
    let resultJson: any;
    try {
      const imagePart = await this.fetchImageAsPart(imageUrl);
      const prompt = `Tu es un botaniste expert. Tu dois IDENTIFIER la plante sur cette photo.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans markdown, sans triples backticks.

Format JSON obligatoire :
{
  "plant_name_fr": "Nom commun en français (ex: Olivier européen)",
  "plant_name_ar": "الاسم بالعربية والدارجة التونسية",
  "plant_name_lat": "Nom en arabe tunisien translittéré",
  "description_fr": "Description courte de la plante (2-3 phrases max)",
  "description_darija": "وصف بالدارجة التونسية (2-3 جمل)",
  "care_tips": ["Conseil 1", "Conseil 2", "Conseil 3"],
  "agricultural_relevance": "Intérêt agricole ou commercial en Tunisie"
}

IMPORTANT : Ne mets AUCUNE virgule après le dernier élément d'un objet ou d'un tableau.`;

      this.logger.log('[Plant Identification AI] Calling Gemini API (rotation)...');
      const result = await this.geminiService.generateContent(
        'gemini-2.0-flash',
        [prompt, imagePart],
        { temperature: 0.1 }
      );
      this.logger.log('[Plant Identification AI] Gemini API responded successfully');
      const rawText = result.response.text();
      resultJson = this.parseJsonResponse(rawText);
    } catch (err) {
      this.logger.error(`[Plant Identification AI] Gemini failed: ${err.message}`);
      this.logger.warn('[Plant Identification AI] Falling back to mock data');
      resultJson = this.getMockPlantIdentification();
    }

    // 3. Save to database
    const record = this.plantIdRepo.create({
      user_id: userId || null,
      ip_address: userId ? null : (ipAddress || null),
      photo_url: imageUrl,
      plant_name_fr: resultJson.plant_name_fr,
      plant_name_ar: resultJson.plant_name_ar,
      plant_name_lat: resultJson.plant_name_lat,
      description_fr: resultJson.description_fr,
      description_darija: resultJson.description_darija,
      care_tips: resultJson.care_tips,
      agricultural_relevance: resultJson.agricultural_relevance,
    });

    await this.plantIdRepo.save(record);

    return {
      rateLimited: false,
      ...resultJson,
      created_at: record.created_at,
    };
  }

  /**
   * Retrieves a user's plant identification history.
   */
  async getUserPlantIdentifications(userId: string): Promise<PlantIdentification[]> {
    return this.plantIdRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  private parseJsonResponse(text: string): any {
    const trimmed = text.trim();
    this.logger.debug(`[Plant Identification AI] Raw Gemini response (first 500 chars): ${trimmed.substring(0, 500)}`);
    try {
      return JSON.parse(trimmed);
    } catch {
      const cleaned = trimmed.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let fixed = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1');
          try {
            return JSON.parse(fixed);
          } catch (innerErr) {
            this.logger.error(`[Plant Identification AI] All JSON parsing failed. Raw text: ${trimmed.substring(0, 800)}`);
            this.logger.error(`[Plant Identification AI] Parse error: ${innerErr.message}`);
            throw new Error('Unable to extract valid JSON from Gemini response');
          }
        }
        this.logger.error(`[Plant Identification AI] No JSON object found. Raw: ${trimmed.substring(0, 800)}`);
        throw new Error('No JSON object found in Gemini response');
      }
    }
  }

  private getMockPlantIdentification() {
    return {
      plant_name_fr: 'Romarin officinal / Rosmarinus officinalis',
      plant_name_ar: 'إكليل الجبل - كليل',
      plant_name_lat: 'Klil',
      description_fr: 'Le romarin est un arbrisseau aromatique poussant à l\'état sauvage sur le pourtour méditerranéen. Il est très résistant à la sécheresse et possède des feuilles persistantes.',
      description_darija: 'الكليل هو نبتة ريحتها فاوحة وتكبر بزاف في الجبال والسهول التونسية. تصبر على الشياح وتستعمل برشا في الطبخ والمداواة.',
      care_tips: [
        'Exposition en plein soleil requis.',
        'Arrosage très modéré, tolère la sécheresse.',
        'Préfère les sols bien drainés, voire caillouteux.',
        'Taille après la floraison pour conserver un port compact.',
      ],
      agricultural_relevance: 'Utilisé pour la production d\'huiles essentielles à haute valeur ajoutée, comme plante mellifère pour un miel de qualité supérieure, et pour la stabilisation des sols en Tunisie.',
    };
  }

  private async fetchImageAsPart(url: string): Promise<Part> {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
    const mimeType = (response.headers['content-type'] as string)?.split(';')[0] || 'image/jpeg';
    return {
      inlineData: {
        data: Buffer.from(response.data).toString('base64'),
        mimeType,
      },
    };
  }
}
