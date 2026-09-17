import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExpertType } from '../../common/enums/expert-type.enum';
import { ProfessionalStatus } from '../../common/enums/professional-status.enum';

@Entity('expert_profiles')
export class ExpertProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  user_id: string;

  @Column({ name: 'expert_type', type: 'enum', enum: ExpertType })
  expert_type: ExpertType;

  @Column({ name: 'professional_status', type: 'jsonb', nullable: true })
  professional_status: string[];

  @Column({ name: 'crda_zone_id', type: 'uuid', nullable: true })
  crda_zone_id: string | null;

  @Column({ name: 'affiliation_name', type: 'varchar', length: 255, nullable: true })
  affiliation_name: string | null;

  @Column({ name: 'institution_name', type: 'varchar', length: 255, nullable: true })
  institution_name: string | null;

  @Column({ name: 'accepts_remote_consultations', default: true })
  accepts_remote_consultations: boolean;

  @Column({ name: 'governorate_zones', type: 'jsonb', nullable: true })
  governorate_zones: string[];

  @Column({ type: 'jsonb', nullable: true })
  certifications: string[];

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ default: false })
  is_profile_completed: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  expert_score: number;

  @Column({ type: 'numeric', precision: 8, scale: 3, nullable: true })
  consultation_rate_tnd: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  tarif_note: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
