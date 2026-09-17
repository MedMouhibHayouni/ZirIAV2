import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(private readonly dataSource: DataSource) {}

  async notifyDiseaseOpportunity(diseaseDetectionId: string) {
    // Alertes Commerciales basées sur PostGIS
    // Trouver les fournisseurs dont la coverage_zone (Polygon) contient la maladie détectée.
    
    // We use QueryBuilder directly for raw SQL capabilities on potentially non-TypeORM registered relations.
    const suppliers = await this.dataSource.query(`
      SELECT s.id, s.name, s.contact_email
      FROM suppliers s
      JOIN disease_detections d ON d.id = $1
      WHERE ST_Contains(s.coverage_zone::geometry, ST_SetSRID(ST_MakePoint(d.lng, d.lat), 4326))
    `, [diseaseDetectionId]);

    for (const supplier of suppliers) {
       this.logger.log(`[OPPORTUNITY] Notify supplier ${supplier.name} (${supplier.contact_email}) for detection ${diseaseDetectionId}`);
       // Notification logic here
    }

    return suppliers;
  }
}
