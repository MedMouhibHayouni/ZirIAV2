import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { WeatherForecast } from '../../weather/weather.service';
import { DetectionUrgency } from '../../disease-detections/entities/disease-detection.entity';
import { GeminiService } from './gemini.service';
import { DiseaseKnowledgeService } from './disease-knowledge.service';

export interface RecommendedProduct {
  id?: string;
  name: string;
  dosage?: string;
  application_method?: string;
  pre_harvest_days?: number;
  price_tnd?: number;
  photo_url?: string;
  in_boutique?: boolean;
}

export interface ReasoningOutput {
  disease: string;
  confidence: number;
  urgency: DetectionUrgency;
  recommendation_fr: string;
  recommendation_darija: string;
  actions: string[];
  explanation_fr: string;
  explanation_darija: string;
  is_weather_aggravated: boolean;
  disease_fr?: string;
  disease_ar?: string;
  disease_lat?: string;
  recommended_products: RecommendedProduct[];
}

@Injectable()
export class ReasoningService {
  private readonly logger = new Logger(ReasoningService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
    private readonly diseaseKnowledgeService: DiseaseKnowledgeService,
    private readonly dataSource: DataSource,
  ) {
    this.logger.log('✅ Gemini Text — Recommandations Agronomiques opérationnel (gemini-2.5-flash)');
  }

  async analyze(
    _imageUrl: string,
    confirmedDisease: string,
    confirmedConfidence: number,
    weather: WeatherForecast,
    cropType: string,
  ): Promise<ReasoningOutput> {
    const baseUrgency = this.computeBaseUrgency(confirmedDisease, weather);

    let parsedResult: any = null;

    if (!this.geminiService.isFullyExhausted()) {
      try {
        const prompt = `Tu es l'ingénieur agronome principal du CRDA (Ministère de l'Agriculture, Tunisie).
Tu t'adresses à un agriculteur tunisien.

DIAGNOSTIC DÉTECTÉ :
- Maladie / État : "${confirmedDisease}"
- Confiance IA : ${(confirmedConfidence * 100).toFixed(1)}%
- Culture : "${cropType}"
- Météo locale actuelle : Température ${weather.temperature_c}°C, Humidité ${weather.humidity_pct}%, Vent ${weather.wind_speed_kmh}km/h, Pluie ${weather.precipitation_mm}mm.

MISSION :
Fournis une analyse agronomique pédagogique, professionnelle et adaptée au terrain tunisien.
Traductions exactes requises :
- Nom en français (ex: "Olivier — Maladie foliaire (Oeil de paon)", "Tomate — Mildiou", "Pommier — Tavelure"). Ne mets JAMAIS de phrase de disclaimer ou d'incertitude dans ce nom.
- Nom arabe/tunisien (ex: "عين الطاووس" pour Oeil de paon, "عثة الزيتون" pour Prays, "البياض الزغبي" pour Mildiou, "نقص العناصر" pour Carence foliaire).
- Nom latin binomial (ex: "Spilocaea oleagina", "Phytophthora infestans").

RÉPONDRE STRICTEMENT EN JSON VALIDE :
{
  "urgency": "CRITICAL" | "MEDIUM" | "LOW",
  "disease_fr": "Nom propre et clair de la maladie en Français",
  "disease_ar": "Nom précis en Arabe",
  "disease_lat": "Nom scientifique Latin binomial",
  "explanation_fr": "Explication claire en 2-3 phrases : quel est l'agent pathogène ou la cause physiologique (champignon, carence nutritive, météo), et pourquoi ces symptômes apparaissent sur la feuille.",
  "explanation_darija": "تفسير واضح بالدارجة التونسية يفهّم الفلاح شنوة السبب في المرض هذا وكيفاش يمس الشجرة",
  "actions": [
    "Action immédiate n°1 (ex: Tailler et aérer les branches infectées)",
    "Action de traitement n°2 (ex: Traitement cuprique / bouillie bordelaise)",
    "Action préventive n°3 (ex: Éliminer les résidus tombés au sol)"
  ],
  "recommendation_fr": "Synthèse rapide des mesures à prendre et surveillance requise.",
  "recommendation_darija": "نصيحة عملية مختصرة ومباشرة بالدارجة التونسية للتدخل السريع",
  "is_weather_aggravated": true
}`;

        const result = await this.geminiService.generateContent(
          'gemini-2.5-flash',
          prompt,
          {
            temperature: 0.2,
            responseMimeType: 'application/json',
          }
        );
        parsedResult = JSON.parse(result.response.text());
      } catch (error) {
        this.logger.error(`Erreur Gemini Reasoning: ${error.message}`);
      }
    }

    const resolvedFr = (parsedResult?.disease_fr && !parsedResult.disease_fr.includes('sûr') && !parsedResult.disease_fr.includes('expert'))
      ? parsedResult.disease_fr
      : confirmedDisease;

    // ─── Fetch Matching Products from Prescription Rules & Boutique ──────────
    const recommended_products = await this.getRecommendedProducts(resolvedFr, cropType);

    if (parsedResult) {
      let urgency: DetectionUrgency = (parsedResult.urgency as DetectionUrgency) || baseUrgency;
      if ((urgency as string) === 'HIGH') urgency = DetectionUrgency.CRITICAL;
      if (![DetectionUrgency.LOW, DetectionUrgency.MEDIUM, DetectionUrgency.CRITICAL].includes(urgency)) {
        urgency = baseUrgency;
      }

      return {
        disease: resolvedFr,
        confidence: confirmedConfidence,
        urgency,
        recommendation_fr: parsedResult.recommendation_fr || '',
        recommendation_darija: parsedResult.recommendation_darija || '',
        actions: Array.isArray(parsedResult.actions) ? parsedResult.actions : [],
        explanation_fr: parsedResult.explanation_fr || '',
        explanation_darija: parsedResult.explanation_darija || '',
        is_weather_aggravated: parsedResult.is_weather_aggravated === true,
        disease_fr: resolvedFr,
        disease_ar: parsedResult.disease_ar || '',
        disease_lat: parsedResult.disease_lat || '',
        recommended_products,
      };
    }

    // ─── Fallback Local KB ──────────────────────────────────────────────────
    return this.buildFallbackOutput(confirmedDisease, confirmedConfidence, baseUrgency, weather, cropType, recommended_products);
  }

  private async getRecommendedProducts(disease: string, crop: string): Promise<RecommendedProduct[]> {
    const products: RecommendedProduct[] = [];
    try {
      const cleanDisease = disease.toLowerCase().replace(/[^a-z0-9à-ÿ ]/gi, ' ').trim();
      const rules = await this.dataSource.query(`
        SELECT allowed_product, default_dosage, default_application_method, pre_harvest_days, notes
        FROM product_prescription_rules
        WHERE LOWER(disease_name) ILIKE $1 OR $2 ILIKE '%' || LOWER(disease_name) || '%'
        LIMIT 4
      `, [`%${cleanDisease}%`, cleanDisease]);

      for (const r of rules) {
        const boutiqueMatch = await this.dataSource.query(`
          SELECT id, name, price_tnd, photo_url
          FROM products
          WHERE is_active = true AND (LOWER(name) ILIKE $1 OR LOWER(description) ILIKE $1)
          LIMIT 1
        `, [`%${r.allowed_product.trim().toLowerCase()}%`]);

        products.push({
          id: boutiqueMatch?.[0]?.id,
          name: boutiqueMatch?.[0]?.name || r.allowed_product,
          dosage: r.default_dosage,
          application_method: r.default_application_method,
          pre_harvest_days: r.pre_harvest_days,
          price_tnd: boutiqueMatch?.[0]?.price_tnd ? Number(boutiqueMatch[0].price_tnd) : undefined,
          photo_url: boutiqueMatch?.[0]?.photo_url || undefined,
          in_boutique: !!boutiqueMatch?.[0]?.id,
        });
      }

      // If no strict prescription rule found, offer relevant boutique fungicides/fertilizers
      if (products.length === 0) {
        const defaultBoutique = await this.dataSource.query(`
          SELECT id, name, price_tnd, photo_url, category
          FROM products
          WHERE is_active = true AND category IN ('FUNGICIDE', 'PESTICIDE', 'FERTILIZER')
          LIMIT 3
        `);
        for (const p of defaultBoutique) {
          products.push({
            id: p.id,
            name: p.name,
            dosage: 'Selon notice technique',
            application_method: 'Pulvérisation foliaire',
            price_tnd: p.price_tnd ? Number(p.price_tnd) : undefined,
            photo_url: p.photo_url || undefined,
            in_boutique: true,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to resolve recommended products: ${err.message}`);
    }
    return products;
  }

  private computeBaseUrgency(disease: string, weather: WeatherForecast): DetectionUrgency {
    const d = disease.toLowerCase();
    const isHealthy = d.includes('saine') || d.includes('healthy') || d.includes('sain');
    if (isHealthy) return DetectionUrgency.LOW;
    const criticalKeywords = ['fusariose', 'mildiou', 'anthracnose', 'botrytis', 'rouille', 'bacterial', 'oeil de paon'];
    const isCritical = criticalKeywords.some((k) => d.includes(k));
    let urgency = isCritical ? DetectionUrgency.CRITICAL : DetectionUrgency.MEDIUM;
    if (weather.humidity_pct > 80 || weather.wind_speed_kmh > 40) urgency = DetectionUrgency.CRITICAL;
    return urgency;
  }

  private buildFallbackOutput(
    disease: string,
    confidence: number,
    urgency: DetectionUrgency,
    weather: WeatherForecast,
    crop: string,
    recommended_products: RecommendedProduct[],
  ): ReasoningOutput {
    const d = disease.toLowerCase();
    let explanation_fr = `Observation d'une anomalie foliaire sur ${crop || 'la plante'}. Les symptômes indiquent un stress ou une attaque pathogène en cours d'évaluation.`;
    let explanation_darija = `فما إصابة ولا علامات نقص في الورقة يلزم متابعتها بالباهي لتجنب العدوى في السانية.`;
    let actions = [
      "Isoler les zones de la parcelle présentant les symptômes",
      "Éviter l'arrosage par aspersion sur le feuillage",
      "Demander la confirmation auprès d'un agronome certifié CRDA"
    ];

    if (d.includes('oeil de paon') || d.includes('acariose') || d.includes('olive')) {
      explanation_fr = "Maladie fongique foliaire typique de l'olivier (Cycloconium / Spilocaea oleagina) ou carence nutritionnelle. L'humidité stagnante favorise la chute prématurée des feuilles.";
      explanation_darija = "مرض عين الطاووس في الزيتون يتسبب في تساقط الأوراق وضعف الإنتاج، خاصة مع الرطوبة العالية في الخريف والشتاء.";
      actions = [
        "Aérer la frondaison par une taille sanitaire modérée",
        "Appliquer un traitement cuprique (Bouillie bordelaise / Oxychlorure de cuivre)",
        "Ramasser et enfouir ou brûler les feuilles malades au sol"
      ];
    } else if (d.includes('mildiou') || d.includes('late_blight')) {
      explanation_fr = "Attaque de mildiou (Phytophthora infestans). Champignon très virulent provoquant des nécroses rapides sous climat humide.";
      explanation_darija = "مرض الميليو الفتاك ينتشر بسرعة كبيرة مع الرطوبة، لازم التدخل الفوري قبل ما يقضي على المحصول.";
      actions = [
        "Stopper immédiatement toute irrigation par aspersion",
        "Traiter au fongicide systémique homologué (Mancozèbe / Diméthomorphe)",
        "Détruire les plants sévèrement atteints pour stopper le foyer"
      ];
    }

    return {
      disease,
      confidence,
      urgency,
      explanation_fr,
      explanation_darija,
      actions,
      recommendation_fr: `Traitement ciblé recommandé pour ${disease}. Respecter les doses prescrites et les délais avant récolte.`,
      recommendation_darija: `لازم تداوي ${disease} في أقرب وقت بالدواء المناسب وتفقد بقية الحقل.`,
      is_weather_aggravated: weather.humidity_pct > 80,
      recommended_products,
    };
  }
}
