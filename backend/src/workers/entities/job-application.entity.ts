import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkerProfile } from './worker-profile.entity';
import { JobOffer } from './job-offer.entity';

/** Statut de la candidature */
export enum ApplicationStatus {
  PENDING = 'PENDING',
  VIEWED = 'VIEWED',
  SHORTLISTED = 'SHORTLISTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * Candidature d'un travailleur pour une offre d'emploi.
 * Cycle de vie : PENDING → ACCEPTED → COMPLETED (travail effectué).
 * Inclut le système de notation post-mission (employer rating).
 */
@Entity('job_applications')
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => JobOffer, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_offer_id' })
  jobOffer: JobOffer;

  @Column({ name: 'job_offer_id' })
  job_offer_id: string;

  @ManyToOne(() => WorkerProfile, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_profile_id' })
  workerProfile: WorkerProfile;

  @Column({ name: 'worker_profile_id' })
  worker_profile_id: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  /**
   * Note donnée par l'employeur après la mission (1 à 5).
   * Décrémentée dans la moyenne du WorkerProfile.rating.
   */
  @Column({
    name: 'employer_rating',
    type: 'decimal',
    precision: 2,
    scale: 1,
    nullable: true,
  })
  employer_rating: number | null;

  /** Message de motivation du travailleur */
  @Column({ type: 'text', nullable: true })
  cover_message: string | null;

  /** Tarif journalier proposé par le travailleur */
  @Column({ name: 'proposed_daily_rate_tnd', type: 'decimal', precision: 8, scale: 2, nullable: true })
  proposed_daily_rate_tnd: number | null;

  /** Notes de l'employeur après la mission */
  @Column({ name: 'employer_notes', type: 'text', nullable: true })
  employer_notes: string | null;

  @Column({ name: 'navigation_deep_link', type: 'varchar', nullable: true })
  navigation_deep_link: string | null;

  @Column({ name: 'mission_context_snapshot', type: 'jsonb', nullable: true })
  mission_context_snapshot: Record<string, any> | null;

  @CreateDateColumn({ name: 'applied_at' })
  applied_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
