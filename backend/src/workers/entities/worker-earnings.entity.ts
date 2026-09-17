import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { WorkerProfile } from './worker-profile.entity';
import { JobApplication } from './job-application.entity';
import { JobOffer } from './job-offer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('worker_earnings')
export class WorkerEarnings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_profile_id' })
  worker_profile_id: string;

  @ManyToOne(() => WorkerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_profile_id' })
  workerProfile: WorkerProfile;

  @Column({ name: 'job_application_id', unique: true })
  job_application_id: string;

  @ManyToOne(() => JobApplication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_application_id' })
  jobApplication: JobApplication;

  @Column({ name: 'job_offer_id' })
  job_offer_id: string;

  @ManyToOne(() => JobOffer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'job_offer_id' })
  jobOffer: JobOffer;

  @Column({ name: 'employer_id' })
  employer_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ name: 'task_type', type: 'varchar' })
  task_type: string;

  @Column({ name: 'duration_days', type: 'integer' })
  duration_days: number;

  @Column({ name: 'daily_pay_tnd', type: 'decimal', precision: 8, scale: 2 })
  daily_pay_tnd: number;

  @Column({ name: 'total_earned_tnd', type: 'decimal', precision: 10, scale: 2 })
  total_earned_tnd: number;

  @Column({ name: 'governorate', type: 'varchar', nullable: true })
  governorate: string | null;

  @Column({ name: 'work_start_date', type: 'date' })
  work_start_date: string | Date;

  @CreateDateColumn({ name: 'completed_at' })
  completed_at: Date;
}
