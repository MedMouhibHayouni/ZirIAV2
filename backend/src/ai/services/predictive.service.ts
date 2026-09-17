import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcel } from '../../parcels/entities/parcel.entity';
import { WeatherForecast, WeatherService } from '../../weather/weather.service';

export interface HarvestPrediction {
  parcel_id: string;
  crop_type: string;
  planted_at: Date | null;
  /** Date de récolte calculée (GDD Motor + ajustement) */
  estimated_harvest_date: Date;
  /** Degrés Jours de Croissance accumulés à ce jour */
  accumulated_gdd: number;
  /** Cible GDD théorique pour la récolte */
  target_gdd: number;
  /** Explication de la prédiction */
  adjustment_reason: string;
}

/**
 * Constantes GDD pour Kasserine.
 * Format : [min_jours, max_jours, temp_optimale_C, temp_base_C]
 * Tbase (Température de base) : En dessous de cette température, la plante ne pousse pas.
 */
const CROP_GROWTH_TABLE: Record<string, { min: number; max: number; optimalTemp: number; baseTemp: number }> = {
  'tomate':        { min: 90,  max: 120, optimalTemp: 24, baseTemp: 10 },
  'piment':        { min: 90,  max: 100, optimalTemp: 25, baseTemp: 12 },
  'piment doux':   { min: 80,  max: 100, optimalTemp: 24, baseTemp: 12 },
  'poivron':       { min: 90,  max: 110, optimalTemp: 24, baseTemp: 12 },
  'blé dur':       { min: 120, max: 150, optimalTemp: 18, baseTemp: 5 },
  'orge':          { min: 110, max: 140, optimalTemp: 16, baseTemp: 5 },
  'sorgho':        { min: 100, max: 120, optimalTemp: 28, baseTemp: 10 },
  'olive':         { min: 180, max: 240, optimalTemp: 22, baseTemp: 10 },
  'amandier':      { min: 200, max: 250, optimalTemp: 20, baseTemp: 7 },
  'pistache':      { min: 180, max: 220, optimalTemp: 23, baseTemp: 7 },
  'melon':         { min: 75,  max: 95,  optimalTemp: 27, baseTemp: 15 },
  'pastèque':      { min: 80,  max: 100, optimalTemp: 28, baseTemp: 15 },
  'pomme de terre':{ min: 90,  max: 120, optimalTemp: 18, baseTemp: 7 },
};

const DEFAULT_CROP = { min: 90, max: 120, optimalTemp: 22, baseTemp: 10 };

/**
 * PredictiveService — Moteur GDD (Growing Degree Days)
 *
 * Utilise l'historique météo réel (via Open-Meteo Archive API) depuis
 * la date de plantation pour calculer précisément la chaleur accumulée.
 */
@Injectable()
export class PredictiveService {
  private readonly logger = new Logger(PredictiveService.name);

  constructor(
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    private readonly weatherService: WeatherService,
  ) {}

  /**
   * Calcule la date de récolte estimée via le moteur GDD.
   */
  async calculateHarvestDate(
    parcelId: string,
    currentWeather: WeatherForecast,
  ): Promise<HarvestPrediction> {
    const parcel = await this.parcelRepo.findOne({ where: { id: parcelId } });
    if (!parcel) throw new NotFoundException(`Parcelle ${parcelId} introuvable`);

    if (!parcel.planted_at) {
      const approxDate = new Date();
      approxDate.setDate(approxDate.getDate() + 90);
      return {
        parcel_id: parcelId,
        crop_type: parcel.crop_type || 'Unknown',
        planted_at: null,
        estimated_harvest_date: approxDate,
        accumulated_gdd: 0,
        target_gdd: 0,
        adjustment_reason: 'Date de plantation non renseignée. Estimation à +90 jours sans GDD.',
      };
    }

    const cropKey = (parcel.crop_type || 'unknown').toLowerCase();
    const constants = CROP_GROWTH_TABLE[cropKey] || DEFAULT_CROP;
    const midGrowingDays = Math.round((constants.min + constants.max) / 2);
    
    // Cible GDD théorique pour cette culture à Kasserine
    const targetGdd = (constants.optimalTemp - constants.baseTemp) * midGrowingDays;

    // Dates pour la requête historique (Planted → Aujourd'hui)
    const plantedDate = new Date(parcel.planted_at);
    const today = new Date();
    
    const formattedPlanted = plantedDate.toISOString().split('T')[0];
    const formattedToday = today.toISOString().split('T')[0];

    // Récupération de l'historique Météo
    const history = await this.weatherService.getHistoricalTemperatures(
      parcel.lat || 35.1674,
      parcel.lng || 8.8362,
      formattedPlanted,
      formattedToday
    );

    let accumulatedGdd = 0;
    
    if (history && history.tmax.length > 0) {
      // Formule exacte : GDD = Sum( (Tmax + Tmin)/2 - Tbase )
      for (let i = 0; i < history.tmax.length; i++) {
        const tmax = history.tmax[i];
        const tmin = history.tmin[i];
        if (tmax != null && tmin != null) {
          const tavg = (tmax + tmin) / 2;
          const dailyGdd = Math.max(0, tavg - constants.baseTemp);
          accumulatedGdd += dailyGdd;
        }
      }
    } else {
      // Fallback si l'API archive échoue : on estime basé sur la météo du jour
      this.logger.warn(`Historique météo indisponible pour ${parcelId}. Utilisation estimation GDD.`);
      const daysSincePlanting = Math.floor((today.getTime() - plantedDate.getTime()) / (1000 * 3600 * 24));
      const dailyGddEst = Math.max(0, currentWeather.temperature_c - constants.baseTemp);
      accumulatedGdd = dailyGddEst * daysSincePlanting;
    }

    // Calculer les jours restants pour atteindre la cible GDD
    const remainingGdd = targetGdd - accumulatedGdd;
    let daysRemaining = 0;

    if (remainingGdd > 0) {
      // Estimer le nombre de jours nécessaires avec la température actuelle
      const currentDailyGdd = Math.max(0, currentWeather.temperature_c - constants.baseTemp);
      if (currentDailyGdd > 0) {
        daysRemaining = Math.ceil(remainingGdd / currentDailyGdd);
      } else {
        daysRemaining = Math.round((constants.min + constants.max) / 2); // Trop froid en ce moment, estimation grossière
      }
    }

    const finalHarvestDate = new Date();
    finalHarvestDate.setDate(today.getDate() + daysRemaining);

    // Ajustement humidité (Stress cryptogamique/hydrique)
    const humiditySensitiveCrops = ['tomate', 'piment', 'poivron', 'melon'];
    const isHumiditySensitive = humiditySensitiveCrops.some(c => cropKey.includes(c));
    if (currentWeather.humidity_pct > 80 && isHumiditySensitive) {
      finalHarvestDate.setDate(finalHarvestDate.getDate() + 3);
    }

    return {
      parcel_id: parcelId,
      crop_type: parcel.crop_type || 'Unknown',
      planted_at: plantedDate,
      estimated_harvest_date: finalHarvestDate,
      accumulated_gdd: Math.round(accumulatedGdd),
      target_gdd: Math.round(targetGdd),
      adjustment_reason: `Modèle GDD dynamique : ${Math.round(accumulatedGdd)}/${Math.round(targetGdd)} GDD atteints avec Tbase=${constants.baseTemp}°C.`,
    };
  }
}
