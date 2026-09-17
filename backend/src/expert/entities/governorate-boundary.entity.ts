import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tunisian_governorate_boundaries')
export class GovernorateBoundary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name_fr: string;

  @Column({ type: 'varchar', length: 100 })
  name_ar: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  polygon: string | null;
}
