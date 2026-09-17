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
import { DriverProfile } from './driver-profile.entity';
import { MarketplaceListing } from '../../marketplace/entities/marketplace-listing.entity';

/** Statut d'une demande de transport */
export enum TransportStatus {
  PENDING = 'PENDING',
  OPEN = 'OPEN',
  NEGOTIATING = 'NEGOTIATING',
  ACCEPTED = 'ACCEPTED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Demande de transport de marchandises agricoles.
 * Créée par un B2B_BUYER après confirmation d'une annonce Marketplace.
 * Acceptée par un DRIVER disponible dans la zone.
 */
@Entity('transport_requests')
export class TransportRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Annonce Marketplace liée (contexte de la marchandise) */
  @ManyToOne(() => MarketplaceListing, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'listing_id' })
  listing: MarketplaceListing | null;

  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listing_id: string | null;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ name: 'requester_id' })
  requester_id: string;

  /** Fermier qui a créé la demande */
  @Column({ name: 'farmer_id', type: 'uuid', nullable: true })
  farmer_id: string | null;

  /** Chauffeur assigné (null jusqu'à acceptation) */
  @ManyToOne(() => DriverProfile, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_profile_id' })
  driver: DriverProfile | null;

  @Column({ name: 'driver_profile_id', type: 'uuid', nullable: true })
  driver_profile_id: string | null;

  /** Latitude du point d'enlèvement */
  @Column({ name: 'origin_lat', type: 'decimal', precision: 10, scale: 7 })
  origin_lat: number;

  /** Longitude du point d'enlèvement */
  @Column({ name: 'origin_lng', type: 'decimal', precision: 10, scale: 7 })
  origin_lng: number;

  /** Adresse textuelle de l'origine */
  @Column({ name: 'origin_address', type: 'varchar', nullable: true })
  origin_address: string | null;

  /** Latitude de la destination */
  @Column({ name: 'destination_lat', type: 'decimal', precision: 10, scale: 7 })
  destination_lat: number;

  /** Longitude de la destination */
  @Column({ name: 'destination_lng', type: 'decimal', precision: 10, scale: 7 })
  destination_lng: number;

  /** Adresse textuelle de la destination */
  @Column({ name: 'destination_address', type: 'varchar', nullable: true })
  destination_address: string | null;

  /** Type de marchandise : tomate, piment, olive, blé... */
  @Column({ name: 'cargo_type' })
  cargo_type: string;

  /** Poids en kg */
  @Column({ name: 'quantity_kg', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity_kg: number;

  /** Poids en tonnes */
  @Column({ name: 'weight_tonnes', type: 'decimal', precision: 8, scale: 3, nullable: true })
  weight_tonnes: number | null;

  /** Type de véhicule requis */
  @Column({ name: 'required_vehicle_type', type: 'varchar', nullable: true })
  required_vehicle_type: string | null;

  /** Date et heure de chargement */
  @Column({ name: 'loading_datetime', type: 'timestamptz', nullable: true })
  loading_datetime: Date | null;

  /** Livraison express */
  @Column({ name: 'is_express', default: false })
  is_express: boolean;

  /** Notes de manipulation spéciale */
  @Column({ name: 'handling_notes', type: 'text', nullable: true })
  handling_notes: string | null;

  /** Prix proposé par l'expéditeur (TND) */
  @Column({ name: 'proposed_price_tnd', type: 'decimal', precision: 10, scale: 2, nullable: true })
  proposed_price_tnd: number | null;

  /** Prix accepté par le chauffeur (TND) */
  @Column({ name: 'accepted_price_tnd', type: 'decimal', precision: 10, scale: 2, nullable: true })
  accepted_price_tnd: number | null;

  /** Date de collecte souhaitée */
  @Column({ name: 'pickup_date', type: 'date', nullable: true })
  pickup_date: Date | null;

  @Column({
    type: 'enum',
    enum: TransportStatus,
    default: TransportStatus.PENDING,
  })
  status: TransportStatus;

  /** Notes de l'expéditeur */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /** Point PostGIS Origine synchronisé */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  origin_location: string;

  /** Point PostGIS Destination synchronisé */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  destination_location: string;

  @BeforeInsert()
  @BeforeUpdate()
  updateLocations() {
    if (this.origin_lat !== null && this.origin_lng !== null) {
      this.origin_location = { type: 'Point', coordinates: [this.origin_lng, this.origin_lat] } as any;
    }
    if (this.destination_lat !== null && this.destination_lng !== null) {
      this.destination_location = { type: 'Point', coordinates: [this.destination_lng, this.destination_lat] } as any;
    }
  }
}
