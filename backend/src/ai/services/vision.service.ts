import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from '@google/generative-ai';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import axios from 'axios';
import { GeminiService } from './gemini.service';
import { DiseaseKnowledgeService } from './disease-knowledge.service';
import { DiagnosisResolutionLog } from '../entities/diagnosis-resolution-log.entity';
import { NameDictionary } from '../../name-dictionary/entities/name-dictionary.entity';

export interface VisionResult {
  disease: string;
  disease_key?: string;
  confidence: number;
  margin?: number;
  crop_detected: string;
  disease_description: string;
  visual_symptoms: string[];
  requires_expert_validation: boolean;
  source: 'local_kb' | 'gemini_vision' | 'pytorch_fallback' | 'mock' | 'local_model';
  resolved_via?: 'local' | 'gemini' | 'expert_escalation';
  recommendation_fr?: string | null;
  recommendation_darija?: string | null;
  is_expert_validated?: boolean;
  name_fr?: string;
  name_ar?: string;
  name_lat?: string;
  top3?: any[];
  excluded_class?: boolean;
  escalation_message?: string;
}

/**
 * VisionService — Moteur de Diagnostic Sentinel V4
 *
 * Chaîne décisionnelle stricte :
 * 1. Vérification classe exclue (Blé / Wheat -> skip local, Gemini + Escalade expert directe)
 * 2. Modèle local calibré v4 (38 classes, seuil conf >= 0.70, marge >= 0.15)
 *    -> Si conf élevée & marge nette : résolu localement (0 token Gemini)
 * 3. Si faible confiance OU marge étroite : Fallback Gemini avec top-3 candidats
 *    -> Si Gemini conf >= 0.75 : résolu via Gemini
 * 4. Si Gemini incertain (< 0.75) ou en désaccord : Escalade Expert immédiate
 * 5. Traçabilité complète dans `diagnosis_resolution_log`
 */
@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private readonly HIGH_RISK_V5 = [
    'opuntia_cochineal_infested',
    'corn_cercospora_leaf_spot',
    'tom_mosaic_virus',
    'corn_northern_leaf_blight',
    'datepalm_fusarium_wilt',
    'datepalm_leaf_spots',
  ];
  private readonly pythonUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
    private readonly diseaseKnowledgeService: DiseaseKnowledgeService,
    @InjectRepository(DiagnosisResolutionLog)
    private readonly resolutionLogRepo: Repository<DiagnosisResolutionLog>,
    @InjectRepository(NameDictionary)
    private readonly nameDictRepo: Repository<NameDictionary>,
  ) {
    this.pythonUrl = configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.logger.log('✅ VisionService — Chaîne décisionnelle V4 active (38 classes, local -> Gemini -> expert)');
  }

  /**
   * Point d'entrée principal du pipeline de diagnostic.
   */
  async classifyDisease(imageUrl: string, cropType?: string, customRequestId?: string): Promise<VisionResult> {
    const requestId = customRequestId || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // ─── GATE 1 : Wheat gate — V5 DISABLED (wheat now included: 5 classes, 4698 images) — kept for audit trail ───
    // Legacy wheat gate removed in V5: wheat_healthy/black_point/blast/fusarium/leaf_blight now served locally.
    // if (isWheat) { ... } — intentionally no-op in V5.

    // ─── GATE 1b : Opuntia / Figuier de Barbarie — NO local class in V5 (0 images), skip local entirely ───
    const isOpuntia = cropType && /(opuntia|figuier|cactus|تين شوكي|تين)/i.test(cropType);
    if (isOpuntia) {
      this.logger.log(`[Opuntia Gate] 🌵 Figuier de Barbarie détecté ("${cropType}"). Aucune classe Opuntia dans le modèle 53 — dérivation directe vers Gemini + expert.`);
      const geminiResult = await this.tryGeminiFallback(imageUrl, cropType, [], requestId);
      if (geminiResult && geminiResult.confidence >= 0.75) {
        const names = await this.lookupNameDictionary(geminiResult.disease_key || geminiResult.disease);
        await this.logResolution(requestId, 'gemini', geminiResult.disease_key || geminiResult.disease, geminiResult.confidence, 0.20);
        return {
          ...geminiResult,
          resolved_via: 'gemini',
          name_fr: names?.name_fr || geminiResult.disease,
          name_ar: names?.name_ar,
          name_lat: names?.name_lat,
        };
      }
      await this.logResolution(requestId, 'expert_escalation', 'opuntia_excluded', 0.0, 0.0);
      return this.buildEscalationResult(
        "Figuier de Barbarie — diagnostic non supporté localement (aucune classe Opuntia entraînée). Mise en relation directe avec un phytopathologiste (cochenille à haut risque).",
        'opuntia_excluded',
        requestId,
      );
    }

    // ─── TIER 1 : Exécution du modèle local calibré V5 (53 classes) ─────────────────────────
    const localResult = await this.classifyWithPyTorch(imageUrl, cropType);
    const conf = localResult.confidence || 0.0;
    const margin = localResult.margin ?? 1.0;
    const needsExpert = localResult.requires_expert_validation || conf < 0.70 || margin < 0.15;

    // Résolution locale : Haute confiance (>= 0.70) et marge nette (>= 0.15)
    if (!needsExpert && conf >= 0.70 && margin >= 0.15 && !localResult.excluded_class) {
      this.logger.log(`[TIER-1 Local] ✅ Résolu localement: ${localResult.disease} (conf: ${(conf * 100).toFixed(1)}%, marge: ${(margin * 100).toFixed(1)}%) — 0 token`);
      const names = await this.lookupNameDictionary(localResult.disease_key || localResult.disease);
      await this.logResolution(requestId, 'local', localResult.disease_key || localResult.disease, conf, margin);
      return {
        ...localResult,
        resolved_via: 'local',
        name_fr: names?.name_fr || localResult.disease,
        name_ar: names?.name_ar,
        name_lat: names?.name_lat,
      };
    }

    // ─── MANDATORY HIGH_RISK escalation (Rule 5 + follow-up: regardless of confidence, even if would be local) ───
    if (this.HIGH_RISK_V5.includes(localResult.disease_key || '')) {
      this.logger.log(`[HIGH_RISK] ⛔ Classe à haut risque ${localResult.disease_key} — escalade expert obligatoire (conf ${conf.toFixed(2)} ignorée)`);
      await this.logResolution(requestId, 'expert_escalation', localResult.disease_key || 'high_risk', conf, margin);
      return this.buildEscalationResult(
        "Pathologie à haut risque détectée — confirmation obligatoire auprès d’un expert phytopathologiste.",
        localResult.disease_key || 'high_risk',
        requestId,
        localResult.top3,
        'local_model',
        localResult.disease,
        conf,
        margin,
      );
    }

    // ─── TIER 2 : Fallback Gemini avec top-3 candidats du modèle local ────────
    this.logger.log(`[Gemini Fallback] ⚠️ Incertitude locale (conf: ${conf.toFixed(2)}, marge: ${margin.toFixed(2)}). Sollicitation Gemini avec candidats...`);
    const geminiResult = await this.tryGeminiFallback(imageUrl, cropType, localResult.top3 || [], requestId);

    if (geminiResult && geminiResult.confidence >= 0.75) {
      this.logger.log(`[Gemini Fallback] ✅ Désambiguïsé par Gemini: ${geminiResult.disease} (conf: ${(geminiResult.confidence * 100).toFixed(1)}%)`);
      const names = await this.lookupNameDictionary(geminiResult.disease_key || geminiResult.disease);
      await this.logResolution(requestId, 'gemini', geminiResult.disease_key || geminiResult.disease, geminiResult.confidence, 0.20);
      return {
        ...geminiResult,
        resolved_via: 'gemini',
        name_fr: names?.name_fr || geminiResult.disease,
        name_ar: names?.name_ar,
        name_lat: names?.name_lat,
      };
    }

    // ─── TIER 3 : Escalade Expert certifié (pas de devinette) ─────────────────
    this.logger.log(`[Expert Escalation] 🚨 Escalade vers phytopathologiste certifié.`);
    await this.logResolution(requestId, 'expert_escalation', localResult.disease_key || 'uncertain_diagnosis', conf, margin);
    const HIGH_RISK_V5 = [
      'opuntia_cochineal_infested',
      'corn_cercospora_leaf_spot',
      'tom_mosaic_virus',
      'corn_northern_leaf_blight',
      'datepalm_fusarium_wilt',
      'datepalm_leaf_spots',
    ];
    const isHighRiskClass = HIGH_RISK_V5.includes(localResult.disease_key || '');
    const isHighRisk = (localResult.requires_expert_validation && conf >= 0.70) || isHighRiskClass;
    const escalationMessage = isHighRisk
      ? "Pathologie à haut risque détectée — confirmation obligatoire auprès d’un expert phytopathologiste."
      : "Nous ne sommes pas assez sûrs de ce diagnostic — nous vous mettons en relation avec un expert phytopathologiste.";

    return this.buildEscalationResult(
      escalationMessage,
      localResult.disease_key || 'uncertain_diagnosis',
      requestId,
      localResult.top3,
      localResult.source || 'local_model',
      localResult.disease, // pass the French display name
      conf,
      margin,
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async logResolution(
    requestId: string,
    resolvedVia: 'local' | 'gemini' | 'expert_escalation',
    predictedClass: string,
    confidence: number,
    margin: number,
  ) {
    try {
      const logEntry = this.resolutionLogRepo.create({
        request_id: requestId,
        resolved_via: resolvedVia,
        predicted_class: predictedClass,
        confidence: Number(confidence.toFixed(4)),
        margin: Number(margin.toFixed(4)),
      });
      await this.resolutionLogRepo.save(logEntry);
      this.logger.log(`[Resolution Log] Enregistré: req=${requestId} | via=${resolvedVia} | class=${predictedClass} | conf=${confidence.toFixed(3)} | marge=${margin.toFixed(3)}`);
    } catch (err) {
      this.logger.warn(`[Resolution Log] Erreur lors de l'enregistrement: ${err.message}`);
    }
  }

  private async lookupNameDictionary(key: string): Promise<NameDictionary | null> {
    try {
      return await this.nameDictRepo.findOne({
        where: [
          { key: key },
          { key: key.toLowerCase() },
          { name_fr: key },
        ],
      });
    } catch {
      return null;
    }
  }

  private buildEscalationResult(
    message: string,
    diseaseKey: string,
    requestId: string,
    top3?: any[],
    source: 'local_model' | 'gemini_vision' | 'local_kb' | 'mock' = 'local_model',
    diseaseFrName?: string,
    confidence: number = 0.0,
    margin: number = 0.0,
  ): VisionResult {
    const isEscalationMsg = (s?: string) => !s || s.includes('sûr') || s.includes('expert') || s.includes('Diagnostic blé');
    
    let realDiseaseName = diseaseFrName;
    if (isEscalationMsg(realDiseaseName)) {
      if (top3 && top3.length > 0 && top3[0].disease && !isEscalationMsg(top3[0].disease)) {
        realDiseaseName = top3[0].disease;
      } else if (diseaseKey && diseaseKey !== 'uncertain_diagnosis' && diseaseKey !== 'wheat_excluded') {
        realDiseaseName = diseaseKey;
      } else {
        realDiseaseName = "Suspicion pathologique (Validation requise)";
      }
    }

    return {
      disease: realDiseaseName || 'Suspicion pathologique (Validation requise)',
      disease_key: diseaseKey,
      confidence: confidence,
      margin: margin,
      crop_detected: 'En attente validation expert',
      disease_description: message,
      visual_symptoms: [],
      requires_expert_validation: true,
      source: source,
      resolved_via: 'expert_escalation',
      top3,
      name_fr: realDiseaseName,
      escalation_message: message,
    };
  }

  private async classifyWithPyTorch(imageUrl: string, cropType?: string): Promise<any> {
    this.logger.log(`[PyTorch Model] Appel local: ${imageUrl} (cropHint: ${cropType || 'none'})`);
    try {
      const response = await firstValueFrom(
        this.httpService
          .post<{
            disease: string;
            disease_key?: string;
            confidence: number;
            margin?: number;
            needs_expert: boolean;
            excluded_class?: boolean;
            top3?: any[];
          }>(
            `${this.pythonUrl}/predict`,
            { image_url: imageUrl, crop_type: cropType },
          )
          .pipe(
            timeout(10000),
            catchError(err => {
              this.logger.warn(`PyTorch microservice indisponible: ${err.message}`);
              return of(null);
            }),
          ),
      );

      if (response?.data?.disease) {
        return {
          disease: response.data.disease,
          disease_key: response.data.disease_key || response.data.disease,
          confidence: response.data.confidence,
          margin: response.data.margin ?? 0.0,
          crop_detected: cropType || 'Non identifiée',
          disease_description: '',
          visual_symptoms: [],
          requires_expert_validation: response.data.needs_expert,
          excluded_class: response.data.excluded_class ?? false,
          top3: response.data.top3 || [],
          source: 'local_model',
        };
      }
    } catch (err) {
      this.logger.error(`PyTorch bridge error: ${err.message}`);
    }

    return {
      disease: 'Indéterminé — Expertise requise',
      disease_key: 'unknown',
      confidence: 0.0,
      margin: 0.0,
      crop_detected: cropType || 'Non identifiée',
      disease_description: '',
      visual_symptoms: [],
      requires_expert_validation: true,
      excluded_class: false,
      top3: [],
      source: 'mock',
    };
  }

  private async tryGeminiFallback(
    imageUrl: string,
    cropHint?: string,
    topCandidates?: any[],
    requestId?: string,
  ): Promise<VisionResult | null> {
    if (this.geminiService.isFullyExhausted()) {
      return null;
    }
    try {
      const imagePart = await this.fetchImageAsPart(imageUrl);
      const candidatesText = topCandidates && topCandidates.length > 0
        ? `\nCANDIDATS DU MODÈLE LOCAL (incertain) :\n` +
          topCandidates.map(c => `- ${c.disease || c.class} (confiance: ${c.confidence})`).join('\n')
        : '';
      const cropContext = cropHint
        ? `\nINFORMATION CULTURE : Culture déclarée "${cropHint}".`
        : '';

      const prompt = `Tu es un expert phytopathologiste d'Afrique du Nord (Tunisie).${cropContext}${candidatesText}
MISSION : Analyser cette photo de plante pour identifier avec certitude la maladie ou confirmer si la plante est saine.
RÈGLES CRITIQUES :
1. Si tu reconnais formellement les symptômes, donne un score de confiance élevé (>= 0.80).
2. Si les symptômes sont ambigus, contradictoires ou si tu hésites entre plusieurs pathologies, renvoie confidence < 0.60.
3. Ne devine JAMAIS.
RÉPONDS EN JSON :
{
  "disease_name": "Nom commun et scientifique",
  "disease_key": "cle_normalisee (ex: tom_early_blight, apple_scab, pot_late_blight)",
  "crop_detected": "Culture détectée",
  "confidence": 0.85,
  "visual_symptoms": ["symptôme 1", "symptôme 2"],
  "disease_description": "Courte description clinique",
  "requires_expert_validation": false
}`;

      const result = await this.geminiService.generateContent(
        'gemini-2.5-flash',
        [prompt, imagePart],
        { temperature: 0.05, responseMimeType: 'application/json' },
      );
      const cleaned = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        disease: parsed.disease_name,
        disease_key: parsed.disease_key,
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        crop_detected: parsed.crop_detected || cropHint || 'Non identifiée',
        disease_description: parsed.disease_description || '',
        visual_symptoms: parsed.visual_symptoms || [],
        requires_expert_validation: parsed.confidence < 0.75 || parsed.requires_expert_validation === true,
        source: 'gemini_vision',
      };
    } catch (e) {
      this.logger.warn(`[Gemini Fallback] Échec de l'appel: ${e.message}`);
      return null;
    }
  }

  private async fetchImageAsPart(url: string): Promise<Part> {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
    const mimeType =
      (response.headers['content-type'] as string)?.split(';')[0] || 'image/jpeg';
    return {
      inlineData: {
        data: Buffer.from(response.data).toString('base64'),
        mimeType,
      },
    };
  }
}
