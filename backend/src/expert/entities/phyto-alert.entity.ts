import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PhytoAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('phyto_alerts')
export class PhytoAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'expert_id' })
  expert: User;

  @Column({ name: 'expert_id' })
  expert_id: string;

  @Column({ name: 'alert_type' })
  alert_type: string;

  @Column({ name: 'crop_type' })
  crop_type: string;

  @Column('text', { array: true, name: 'affected_governorates' })
  affected_governorates: string[];

  @Column({
    type: 'enum',
    enum: PhytoAlertSeverity,
    default: PhytoAlertSeverity.MEDIUM,
  })
  severity: PhytoAlertSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  recommendations: string;

  @Column({ type: 'timestamp', nullable: true })
  valid_until: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
