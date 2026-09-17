import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ApplicationMethod {
  SPRAY = 'SPRAY', IRRIGATION = 'IRRIGATION', SOIL = 'SOIL',
}

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'detection_id', type: 'uuid', nullable: true })
  detection_id: string | null;

  @Column({ name: 'expert_id', type: 'uuid' })
  expert_id: string;

  @Column({ name: 'farmer_id', type: 'uuid', nullable: true })
  farmer_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  product_name: string;

  @Column({ type: 'varchar', length: 100 })
  dosage: string;

  @Column({ type: 'enum', enum: ApplicationMethod, default: ApplicationMethod.SPRAY })
  application_method: ApplicationMethod;

  @Column({ type: 'int', nullable: true })
  pre_harvest_days: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  valid_until: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
