import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Statut d'une offre d'emploi saisonnier */
export enum JobStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  CLOSED = 'CLOSED',
}

/**
 * Offre d'emploi saisonnier publiée par un agriculteur ou coopérative.
 * Consultable par les AGRI_WORKER.
 */
@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ name: 'employer_id' })
  employer_id: string;

  /** Type de tâche : récolte, irrigation, plantation, taille... */
  @Column({ name: 'task_type' })
  task_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number;

  /** Salaire journalier en TND */
  @Column({ name: 'daily_pay_tnd', type: 'decimal', precision: 8, scale: 2 })
  daily_pay_tnd: number;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.OPEN,
  })
  status: JobStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
