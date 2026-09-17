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

/** Type de véhicule de transport agricole */
export enum VehicleType {
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  PICKUP = 'PICKUP',
  REFRIGERATED = 'REFRIGERATED',
  SEMI = 'SEMI',
}

/**
 * Profil d'un chauffeur de transport agricole (rôle DRIVER).
 * Contient les informations du véhicule, la capacité de charge et la position GPS.
 */
@Entity('driver_profiles')
export class DriverProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  user_id: string;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: VehicleType,
    default: VehicleType.TRUCK,
  })
  vehicle_type: VehicleType;

  /** Capacité de charge en tonnes */
  @Column({ name: 'capacity_tonnes', type: 'decimal', precision: 6, scale: 2 })
  capacity_tonnes: number;

  /** Latitude GPS actuelle */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number | null;

  /** Longitude GPS actuelle */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number | null;

  /** Gouvernorat de base opérationnelle */
  @Column({ type: 'varchar', nullable: true })
  governorate: string | null;

  /** Disponible pour de nouvelles missions */
  @Column({ name: 'is_available', default: true })
  is_available: boolean;

  /** Note moyenne reçue des expéditeurs (0-5) */
  @Column({ name: 'rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  /** Numéro de permis de conduire */
  @Column({ name: 'license_number', type: 'varchar', nullable: true })
  license_number: string | null;

  /** Immatriculation du véhicule */
  @Column({ name: 'vehicle_plate', type: 'varchar', nullable: true })
  vehicle_plate: string | null;

  /** Photo du véhicule (URL Cloudinary) */
  @Column({ name: 'vehicle_photo_url', type: 'varchar', nullable: true })
  vehicle_photo_url: string | null;

  /** Latitude GPS live (session active) */
  @Column({ name: 'live_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  live_lat: number | null;

  /** Longitude GPS live (session active) */
  @Column({ name: 'live_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  live_lng: number | null;

  /** Point PostGIS live (mis à jour en temps réel par la gateway GPS) */
  @Column({
    name: 'live_location',
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  live_location: string | null;

  /** Indique si le chauffeur diffuse sa position en temps réel */
  @Column({ name: 'is_tracking_active', default: false })
  is_tracking_active: boolean;

  /** ID de session de tracking pour valider les messages WS */
  @Column({ name: 'tracking_session_id', type: 'varchar', nullable: true })
  tracking_session_id: string | null;

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
