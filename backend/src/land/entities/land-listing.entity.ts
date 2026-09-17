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

/** Type d'offre foncière */
export enum LandListingType {
  SALE = 'SALE',
  RENT = 'RENT',
  LEASE = 'LEASE',
}

/** Statut de l'annonce foncière */
export enum LandListingStatus {
  ACTIVE = 'ACTIVE',
  UNDER_OFFER = 'UNDER_OFFER',
  CLOSED = 'CLOSED',
}

/**
 * Annonce foncière publiée par un LAND_OWNER.
 * Contient une boundary GeoJSON pour l'affichage Leaflet et les données
 * cadastrales nécessaires à la prospection agricole.
 */
@Entity('land_listings')
export class LandListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  owner_id: string;

  /** Surface en hectares */
  @Column({ name: 'surface_ha', type: 'decimal', precision: 8, scale: 2 })
  surface_ha: number;

  /** Type de sol : argileux, limoneux, sableux, calcaire, volcanique... */
  @Column({ name: 'soil_type', type: 'varchar', nullable: true })
  soil_type: string | null;

  /** Gouvernorat de localisation */
  @Column({ type: 'varchar', nullable: true })
  governorate: string | null;

  /**
   * GeoJSON polygon/point représentant les délimitations du terrain.
   * Utilisé par Leaflet pour afficher le terrain sur la carte.
   */
  @Column({ type: 'jsonb', nullable: true })
  boundary: Record<string, unknown> | null;

  /** Latitude GPS du centroïde (pour les recherches spatiales) */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number | null;

  /** Longitude GPS */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number | null;

  /** Description textuelle de la localisation */
  @Column({ name: 'location_description', type: 'text', nullable: true })
  location_description: string | null;

  /** Prix par hectare en TND */
  @Column({ name: 'price_per_ha', type: 'decimal', precision: 10, scale: 2 })
  price_per_ha: number;

  @Column({
    name: 'listing_type',
    type: 'enum',
    enum: LandListingType,
    default: LandListingType.SALE,
  })
  listing_type: LandListingType;

  @Column({
    type: 'enum',
    enum: LandListingStatus,
    default: LandListingStatus.ACTIVE,
  })
  status: LandListingStatus;

  /** Description générale du terrain et de ses avantages */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** URL de la photo principale (Cloudinary) */
  @Column({ name: 'photo_url', type: 'varchar', nullable: true })
  photo_url: string | null;

  /** Accès à l'eau : puits, canal, forage, pluvial */
  @Column({ name: 'water_access', type: 'varchar', nullable: true })
  water_access: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /** Point PostGIS (Centroïde) synchronisé */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  center_location: string;

  @BeforeInsert()
  @BeforeUpdate()
  updateLocation() {
    if (this.lat !== null && this.lng !== null) {
      this.center_location = { type: 'Point', coordinates: [this.lng, this.lat] } as any;
    }
  }
}
