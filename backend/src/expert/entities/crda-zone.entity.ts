import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('crda_zones')
export class CrdaZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  region_name: string;

  @Column({ type: 'varchar', length: 100 })
  district_name: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  polygon: string | null;
}
