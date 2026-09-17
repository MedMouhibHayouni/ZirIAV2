import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from '../../equipment/entities/equipment.entity';
import { WeatherForecast } from '../../weather/weather.service';
import { NotificationService } from '../../notifications/notification.service';

export interface LogisticsAlert {
  at_risk_count: number;
  alerted_owners: string[];
  trigger_reasons: string[];
}

/** Rayon de proximité géographique pour l'alerte (en mètres, ex: 15 km) */
const PROXIMITY_RADIUS_METERS = 15000;

/**
 * LogisticsService — Gestion Préventive des Équipements Agricoles
 *
 * Si les conditions météo sont dangereuses (vent > 40 km/h OU précip > 70%),
 * identifie les équipements dans la zone GPS et notifie les propriétaires.
 *
 * Logique de proximité : Filtre les équipements dont les coordonnées GPS
 * sont à moins de PROXIMITY_RADIUS_DEG degrés de la position de l'alerte.
 */
@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Évalue si les conditions météo posent un risque logistique
   * et notifie les propriétaires d'équipements concernés.
   *
   * @param lat      - Latitude de l'alerte
   * @param lng      - Longitude de l'alerte
   * @param weather  - Snapshot météo
   */
  async runPreventiveCheck(
    lat: number,
    lng: number,
    weather: WeatherForecast,
  ): Promise<LogisticsAlert> {
    const triggerReasons: string[] = [];
    const isHighWind = weather.wind_speed_kmh > 40;
    const isHighPrecip = (weather.probability_of_precipitation ?? 0) > 70;

    // Seuil météo non atteint → pas d'alerte
    if (!isHighWind && !isHighPrecip) {
      return { at_risk_count: 0, alerted_owners: [], trigger_reasons: [] };
    }

    if (isHighWind) {
      triggerReasons.push(`Vent dangereux: ${weather.wind_speed_kmh} km/h (seuil: 40 km/h)`);
    }
    if (isHighPrecip) {
      triggerReasons.push(`Risque de pluie: ${weather.probability_of_precipitation}% (seuil: 70%)`);
    }

    this.logger.warn(`Alerte logistique déclenchée: ${triggerReasons.join(' | ')}`);

    // Recherche des équipements dans la zone géographique
    const nearbyEquipment = await this.findEquipmentInZone(lat, lng);

    if (nearbyEquipment.length === 0) {
      this.logger.log('Aucun équipement trouvé dans la zone d\'alerte');
      return { at_risk_count: 0, alerted_owners: [], trigger_reasons: triggerReasons };
    }

    // Notification push aux propriétaires
    const notifiedOwners: string[] = [];
    const ownersSeen = new Set<string>();

    for (const equipment of nearbyEquipment) {
      if (!ownersSeen.has(equipment.owner_id)) {
        ownersSeen.add(equipment.owner_id);
        notifiedOwners.push(equipment.owner_id);

        await this.notificationService.sendPushToUser(equipment.owner_id, {
          title: 'Alerte Météo — Équipement à Risque',
          message:
            `Conditions météo dangereuses dans votre zone : ${triggerReasons.join(', ')}. ` +
            `Veuillez sécuriser votre matériel (${equipment.type}) immédiatement.`,
          payload: {
            type: 'EQUIPMENT_WEATHER_ALERT',
            equipment_id: equipment.id,
            wind_speed: String(weather.wind_speed_kmh),
            precipitation_probability: String(weather.probability_of_precipitation),
          },
        });
      }
    }

    this.logger.log(
      `Alertes envoyées à ${notifiedOwners.length} propriétaires pour ${nearbyEquipment.length} équipements`,
    );

    return {
      at_risk_count: nearbyEquipment.length,
      alerted_owners: notifiedOwners,
      trigger_reasons: triggerReasons,
    };
  }

  /**
   * Recherche les équipements géolocalisés dans un rayon précis autour du point GPS.
   * Utilise PostGIS (ST_DWithin et ST_MakePoint) pour une précision spatiale réelle.
   */
  private async findEquipmentInZone(lat: number, lng: number): Promise<Equipment[]> {
    return this.equipmentRepo
      .createQueryBuilder('equipment')
      .where('equipment.lat IS NOT NULL')
      .andWhere('equipment.lng IS NOT NULL')
      .andWhere(
        'ST_DWithin(ST_MakePoint(equipment.lng, equipment.lat)::geography, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)',
        { lng, lat, radiusMeters: PROXIMITY_RADIUS_METERS },
      )
      .getMany();
  }
}
