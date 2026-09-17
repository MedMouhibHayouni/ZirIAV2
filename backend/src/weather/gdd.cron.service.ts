import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { WeatherService } from './weather.service';
import { NotificationService } from '../notifications/notification.service';

/**
 * GDD (Growing Degree Days) Cron Service.
 *
 * S'exécute chaque nuit à 23:00.
 */
@Injectable()
export class GddCronService {
  private readonly logger = new Logger(GddCronService.name);

  // Harvest thresholds per crop type
  private readonly CROP_THRESHOLDS: Record<string, number> = {
    'tomate': 1200,
    'blé': 1500,
    'orge': 1100,
    'piment': 1400,
    'oignon': 1000,
    'pomme_de_terre': 1300,
  };

  constructor(
    private readonly dataSource: DataSource,
    private readonly weatherService: WeatherService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 23 * * *') // Nightly at 23:00
  async calculateDailyGdd() {
    this.logger.log('Lancement du Batch Quotidien GDD (Growing Degree Days)...');

    let zones: any[] = [];
    try {
      zones = await this.dataSource.query(`
        SELECT 
          cz.id, 
          cz.crop_type, 
          cz.planted_at, 
          cz.gdd_accumulated, 
          cz.base_temp_c, 
          cz.surface_ha, 
          p.center_lat as lat, 
          p.center_lng as lng, 
          p.owner_id 
        FROM crop_zones cz 
        JOIN parcels p ON cz.parcel_id = p.id 
        WHERE cz.status = 'ACTIVE'
      `);
    } catch (e) {
      this.logger.warn(`Erreur lors de la récupération des crop_zones: ${e.message}`);
      return;
    }

    this.logger.log(`${zones.length} zones trouvées pour le calcul GDD.`);

    let updatedCount = 0;
    const batchSize = 30;

    for (let i = 0; i < zones.length; i += batchSize) {
      const batch = zones.slice(i, i + batchSize);

      await Promise.all(batch.map(async (zone) => {
        try {
          const tDate = new Date();
          tDate.setDate(tDate.getDate() - 1); // Yesterday
          const dateStr = tDate.toISOString().split('T')[0];

          // Needs real lat/lng, fallback to default if missing
          const lat = zone.lat || 35.1674;
          const lng = zone.lng || 8.8362;

          const history = await this.weatherService.getHistoricalTemperatures(lat, lng, dateStr, dateStr);

          if (history && history.tmax.length > 0 && history.tmin.length > 0) {
            const tMax = history.tmax[0];
            const tMin = history.tmin[0];
            
            const baseTemp = zone.base_temp_c || 10;
            const dailyGdd = Math.max(0, ((tMax + tMin) / 2) - baseTemp);

            const currentGdd = Number(zone.gdd_accumulated || 0);
            const newGdd = currentGdd + dailyGdd;
            
            let alertLevel = zone.alert_level || 'NORMAL';
            const threshold = this.CROP_THRESHOLDS[zone.crop_type?.toLowerCase()] || 1200; // default 1200

            if (newGdd >= threshold) {
              alertLevel = 'CRITICAL';
            } else if (newGdd >= threshold * 0.85) {
              alertLevel = 'WARNING';
            }

            const gddPercentage = Math.min(100, (newGdd / threshold) * 100);
            const harvestEtaDays = newGdd >= threshold ? 0 : Math.ceil((threshold - newGdd) / 8); // assuming 8 GDD/day avg

            // Update DB
            await this.dataSource.query(`
              UPDATE crop_zones 
              SET gdd_accumulated = $1, alert_level = $2, gdd_percentage = $3, harvest_eta_days = $4
              WHERE id = $5
            `, [newGdd, alertLevel, gddPercentage, harvestEtaDays, zone.id]);

            updatedCount++;

            // Alert logic if crossed threshold
            if (alertLevel === 'CRITICAL' && zone.alert_level !== 'CRITICAL') {
              this.notificationService.sendPushToUser(zone.owner_id, {
                title: 'Alerte Récolte Imminente',
                message: `La zone de ${zone.crop_type} a atteint ${Math.round(newGdd)} GDD et est prête pour la récolte !`,
                payload: { type: 'HARVEST_ALERT', cropZoneId: zone.id }
              });
            }
          }
        } catch (error) {
          this.logger.warn(`Échec GDD pour zone ${zone.id} : ${error.message}`);
        }
      }));

      // Delay 400ms between batches to prevent API rate limiting from weather service
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    this.logger.log(`Le Batch GDD a mis à jour ${updatedCount}/${zones.length} zones.`);
  }
}
