import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';

/** Statut d'une offre d'emploi saisonnier */
export enum JobOfferStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/**
 * Offre d'emploi saisonnier publiée par un FARMER ou COOP_PRESIDENT.
 * Liée optionnellement à une parcelle spécifique.
 * Visible par les WORKER / AGRI_WORKER dans leur zone GPS.
 */
@Entity('job_offers')
export class JobOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ name: 'employer_id' })
  employer_id: string;

  @ManyToOne(() => Parcel, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel | null;

  @Column({ name: 'parcel_id', type: 'uuid', nullable: true })
  parcel_id: string | null;

  /** Type de tâche : récolte, irrigation, plantation, taille, désherbage... */
  @Column({ name: 'task_type' })
  task_type: string;

  /** Description détaillée de la mission */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Date de début de la mission */
  @Column({ name: 'start_date', type: 'date' })
  start_date: Date;

  /** Durée en jours */
  @Column({ name: 'duration_days' })
  duration_days: number;

  /** Nombre de travailleurs recherchés */
  @Column({ name: 'workers_needed', default: 1 })
  workers_needed: number;

  /** Salaire journalier proposé en TND */
  @Column({ name: 'daily_pay_tnd', type: 'decimal', precision: 8, scale: 2 })
  daily_pay_tnd: number;

  /** Latitude GPS du lieu de travail */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number | null;

  /** Longitude GPS */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number | null;

  /** Gouvernorat (pour le filtre spatial côté API) */
  @Column({ type: 'varchar', nullable: true })
  governorate: string | null;

  @Column({
    type: 'enum',
    enum: JobOfferStatus,
    default: JobOfferStatus.OPEN,
  })
  status: JobOfferStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /** Point PostGIS synchronisé via hooks */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: string;

  @BeforeInsert()
  @BeforeUpdate()
  updateLocation() {
    if (this.lat !== null && this.lng !== null) {
      this.location = { type: 'Point', coordinates: [this.lng, this.lat] } as any;
    }
  }
}
