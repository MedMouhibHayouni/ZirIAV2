import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Parcel } from './parcel.entity';
import { ColumnNumericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('crop_zones')
export class CropZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Parcel, (parcel) => parcel.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'parcel_id' })
  parcel_id: string;

  @Column({ name: 'crop_type', type: 'varchar' })
  crop_type: string;

  @Column({ name: 'color_hex', type: 'varchar', length: 7, nullable: true })
  color_hex: string | null;

  @Column({ name: 'alert_level', type: 'varchar', default: 'NORMAL' })
  alert_level: 'NORMAL' | 'WARNING' | 'CRITICAL';

  @Column({ type: 'geography', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  boundary: any;

  @Column({ name: 'surface_ha', type: 'decimal', precision: 10, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  surface_ha: number;

  @Column({ name: 'planted_at', type: 'date', nullable: true })
  planted_at: Date | null;

  @Column({ name: 'gdd_accumulated', type: 'decimal', precision: 8, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  gdd_accumulated: number;

  @Column({ name: 'gdd_target', type: 'decimal', precision: 8, scale: 2, default: 1500, transformer: new ColumnNumericTransformer() })
  gdd_target: number;

  @Column({ name: 'gdd_percentage', type: 'decimal', precision: 5, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  gdd_percentage: number;

  @Column({ name: 'harvest_threshold', type: 'decimal', precision: 8, scale: 2, default: 1500, transformer: new ColumnNumericTransformer() })
  harvest_threshold: number;

  @Column({ name: 'harvest_eta_days', type: 'int', nullable: true })
  harvest_eta_days: number | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'plant_count', type: 'int', default: 0 })
  plant_count: number;

  @Column({ name: 'harvest_prediction_date', type: 'date', nullable: true })
  harvest_prediction_date: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
