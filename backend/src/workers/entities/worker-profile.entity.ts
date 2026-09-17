import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AvailabilityStatus } from './availability-status.enum';

export enum WorkerBadge {
  CONFIRMED = 'CONFIRMED',
  EXPERT = 'EXPERT',
}

@Entity('worker_profiles')
export class WorkerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  user_id: string;

  // ─── Identity ───

  @Column({ type: 'text', array: true, default: '{}' })
  skills: string[];

  @Column({ name: 'primary_specialty', type: 'varchar', length: 50, nullable: true })
  primary_specialty: string | null;

  @Column({ name: 'secondary_specialties', type: 'jsonb', nullable: true })
  secondary_specialties: string[] | null;

  @Column({ name: 'daily_rate_tnd', type: 'decimal', precision: 8, scale: 2 })
  daily_rate_tnd: number;

  @Column({ name: 'action_radius_km', type: 'int', default: 30 })
  action_radius_km: number;

  @Column({ type: 'varchar', nullable: true })
  governorate: string | null;

  @Column({ type: 'varchar', nullable: true })
  delegation: string | null;

  // ─── Availability ───

  @Column({ name: 'is_available', default: true })
  is_available: boolean;

  @Column({ name: 'availability_status', type: 'varchar', length: 30, default: 'AVAILABLE_NOW' })
  availability_status: string;

  @Column({ name: 'available_from_date', type: 'date', nullable: true })
  available_from_date: Date | null;

  @Column({ name: 'unavailable_until_date', type: 'date', nullable: true })
  unavailable_until_date: Date | null;

  // ─── Rating & Stats ───

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'total_jobs_done', default: 0 })
  total_jobs_done: number;

  @Column({ name: 'total_missions_completed', type: 'int', default: 0 })
  total_missions_completed: number;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  average_rating: number;

  @Column({ name: 'farmer_rating_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  farmer_rating_score: number | null;

  @Column({ name: 'response_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  response_rate: number | null;

  // ─── Badges ───

  @Column({ name: 'worker_badge', type: 'varchar', length: 20, nullable: true })
  worker_badge: string | null;

  @Column({ name: 'is_ambassador_validated', default: false })
  is_ambassador_validated: boolean;

  @Column({ name: 'id_card_verified', default: false })
  id_card_verified: boolean;

  // ─── Physical Capabilities ───

  @Column({ name: 'physical_capabilities', type: 'jsonb', nullable: true })
  physical_capabilities: string[] | null;

  // ─── Bio & Languages ───

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'jsonb', nullable: true })
  languages: string[] | null;

  // ─── Legacy / Provider fields ───

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number | null;

  @Column({ type: 'simple-array', nullable: true })
  diplomas: string[] | null;

  @Column({ name: 'available_from', type: 'date', nullable: true })
  available_from: Date | null;

  @Column({ name: 'available_to', type: 'date', nullable: true })
  available_to: Date | null;

  @Column({ name: 'accommodation_provided', default: false })
  accommodation_provided: boolean;

  @Column({ name: 'meals_provided', default: false })
  meals_provided: boolean;

  @Column({ name: 'transport_provided', default: false })
  transport_provided: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location: string;

  @BeforeInsert()
  @BeforeUpdate()
  updateLocation() {
    if (this.lat !== null && this.lng !== null) {
      this.location = { type: 'Point', coordinates: [this.lng, this.lat] } as any;
    }
  }
}
