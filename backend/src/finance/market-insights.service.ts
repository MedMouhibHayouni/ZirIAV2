import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConnectionStatus } from '../marketplace/entities/marketplace-connection.entity';

@Injectable()
export class MarketInsightsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * L'Oracle des Prix :
   * Calcule la moyenne des prix validés (COMPLETED) sur les 30 derniers jours,
   * groupée par type de culture (crop_type). Exige `postgis` ou du simple SQL d'agrégation.
   */
  async getDailyMarketPrices(): Promise<{ crop_type: string; average_price_tnd: number; transaction_count: number }[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await this.dataSource.query(`
      SELECT 
        LOWER(l.crop_type) AS crop_type,
        AVG(c.negotiated_price_tnd) AS average_price_tnd,
        COUNT(c.id) AS transaction_count
      FROM marketplace_connections c
      INNER JOIN marketplace_listings l ON c.listing_id = l.id
      WHERE c.status = 'COMPLETED'
        AND c.updated_at >= $1
        AND c.negotiated_price_tnd IS NOT NULL
      GROUP BY LOWER(l.crop_type)
      ORDER BY transaction_count DESC
    `, [thirtyDaysAgo]);

    return results.map((row: any) => ({
      crop_type: row.crop_type,
      average_price_tnd: parseFloat(row.average_price_tnd).toFixed(2),
      transaction_count: parseInt(row.transaction_count, 10),
    }));
  }
}
