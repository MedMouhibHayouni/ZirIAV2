import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ExpertType } from '../../common/enums/expert-type.enum';

export enum FieldReportSeverity {
  LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH', CRITICAL = 'CRITICAL',
}

export enum FieldReportStatus {
  PENDING = 'PENDING', EXPERT_REVIEWING = 'EXPERT_REVIEWING', RESOLVED = 'RESOLVED',
}

@Entity('field_reports')
export class FieldReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ambassador_id', type: 'uuid' })
  ambassador_id: string;

  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zone_id: string | null;

  @Column({ name: 'farmer_id', type: 'uuid', nullable: true })
  farmer_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photo_urls: string[] | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ type: 'text', nullable: true })
  recommendations: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  location_lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  location_lng: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  gps_lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  gps_lng: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  affected_crop_type: string | null;

  @Column({ name: 'crop_type', type: 'varchar', length: 100, nullable: true })
  crop_type: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  affected_area_ha: number | null;

  @Column({ type: 'enum', enum: FieldReportSeverity, default: FieldReportSeverity.MEDIUM })
  severity: FieldReportSeverity;

  @Column({ type: 'enum', enum: FieldReportStatus, default: FieldReportStatus.PENDING })
  status: FieldReportStatus;

  @Column({ name: 'required_expert_type', type: 'enum', enum: ExpertType, nullable: true })
  required_expert_type: ExpertType | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
