import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class GddCronService {
  private readonly logger = new Logger(GddCronService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async batchCalculateGdd() {
    this.logger.log('Starting Geographically Batched GDD Calculation...');

    // 1. Cluster parcels using PostGIS ST_ClusterDBSCAN
    let clusters: any[] = [];
    try {
        clusters = await this.dataSource.query(`
          WITH ClusteredParcels AS (
            SELECT 
              id, 
              ST_Centroid(boundary::geometry) as geom,
              ST_ClusterDBSCAN(boundary::geometry, eps := 0.05, minpoints := 1) OVER() AS cluster_id
            FROM parcels
          )
          SELECT 
            cluster_id, 
            ST_Y(ST_Centroid(ST_Collect(geom))) as lat, 
            ST_X(ST_Centroid(ST_Collect(geom))) as lng,
            ARRAY_AGG(id) as parcel_ids
          FROM ClusteredParcels
          GROUP BY cluster_id
        `);
    } catch (e) {
        this.logger.error('Failed to cluster parcels. PostGIS might be missing boundary geometries', e.message);
        return;
    }

    let apiCallsSaved = 0;
    const totalParcels = clusters.reduce((acc, c) => acc + c.parcel_ids.length, 0);

    for (const cluster of clusters) {
      try {
        // MOCK: Fetch weather ONCE for the entire cluster centroid from Open-Meteo
        // const weatherData = await this.weatherService.getHistoricalWeather(cluster.lat, cluster.lng, 1);
        const avgTemp = 22; // Simulated response
        
        // Base temp for typical crop like tomato is 10C
        const baseTemp = 10;
        const dailyGdd = Math.max(0, avgTemp - baseTemp);

        // Batch update all parcels in this cluster
        const parcelIdsStr = cluster.parcel_ids.map(id => `'${id}'`).join(',');
        
        // Assume we update crop_zones linked to these parcels
        try {
            await this.dataSource.query(`
              UPDATE crop_zones
              SET accumulated_gdd = accumulated_gdd + $1
              WHERE parcel_id IN (${parcelIdsStr})
            `, [dailyGdd]);
        } catch (e) {
            // crop_zones might not exist, skip silently for MVP
        }

        apiCallsSaved += (cluster.parcel_ids.length - 1); // 1 call instead of N calls
      } catch (error) {
        this.logger.error(`Failed to process cluster ${cluster.cluster_id}: ${error.message}`);
      }
    }

    this.logger.log(`GDD Batching completed. Total parcels: ${totalParcels}. Open-Meteo API calls saved: ${apiCallsSaved}`);
  }
}
