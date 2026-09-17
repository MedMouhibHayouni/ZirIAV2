import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';

/** Statut complet d'une annonce Marketplace */
export enum ListingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  TRANSPORT_REQUESTED = 'TRANSPORT_REQUESTED',
  COMPLETED = 'COMPLETED',
  SOLD = 'SOLD',
  CANCELLED = 'CANCELLED',
}

/** Catégories de produits disponibles sur le Marketplace */
export enum ListingCategory {
  FRESH_PRODUCE    = 'FRESH_PRODUCE',
  LIVESTOCK        = 'LIVESTOCK',
  FORAGE_FEED      = 'FORAGE_FEED',
  EQUIPMENT        = 'EQUIPMENT',
  LAND             = 'LAND',
  PROCESSED        = 'PROCESSED',
  SEEDS            = 'SEEDS',
  GENERAL          = 'GENERAL',
}

/** Condition de l'équipement agricole */
export enum EquipmentCondition {
  NEW  = 'NEW',
  USED = 'USED',
}

@Entity('marketplace_listings')
export class MarketplaceListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'seller_id' })
  seller_id: string;

  @ManyToOne(() => Parcel, { eager: false, nullable: true })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'parcel_id', type: 'varchar', nullable: true })
  parcel_id: string | null;

  // ─── Core Listing Fields ────────────────────────────────────────────────────

  /** Titre de l'annonce */
  @Column({ name: 'title', type: 'varchar', nullable: true })
  title: string | null;

  /** Description détaillée */
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  /** Catégorie principale */
  @Column({
    type: 'enum',
    enum: ListingCategory,
    default: ListingCategory.FRESH_PRODUCE,
  })
  category: ListingCategory;

  /** Type de culture / produit (héritage + recherche) */
  @Column({ name: 'crop_type', nullable: true, type: 'varchar' })
  crop_type: string | null;

  /** Liste des images et vidéos associées (Sprint 6) */
  @Column({ name: 'media_items', type: 'jsonb', default: [] })
  media_items: { type: 'photo' | 'video'; url: string; position: number }[];

  /** Cache dénormalisé pour l'image principale (Sprint 6) */
  @Column({ name: 'primary_media_url', type: 'varchar', nullable: true })
  primary_media_url: string | null;

  /** Score de qualité de l'annonce de 0 à 100 (Sprint 6) */
  @Column({ name: 'listing_quality_score', type: 'smallint', default: 0 })
  listing_quality_score: number;

  // ─── Prix & Quantité ────────────────────────────────────────────────────────

  /** Quantité (valeur générique) */
  @Column({ name: 'quantity_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  quantity_value: number | null;

  /** Unité de quantité: kg, tonnes, têtes, ha, unité, etc. */
  @Column({ name: 'quantity_unit', type: 'varchar', nullable: true })
  quantity_unit: string | null;

  /** Rétrocompat: quantité en tonnes */
  @Column({ name: 'quantity_tonnes', type: 'decimal', precision: 10, scale: 3, nullable: true })
  quantity_tonnes: number | null;

  /** Prix par kg (rétrocompat) */
  @Column({ name: 'price_per_kg', type: 'decimal', precision: 8, scale: 3, nullable: true })
  price_per_kg: number | null;

  /** Prix affiché (TND, peut être null si prix sur demande) */
  @Column({ name: 'price_tnd', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price_tnd: number | null;

  /** Si true, le prix est "sur demande" (non affiché publiquement) */
  @Column({ name: 'price_on_request', type: 'boolean', default: false })
  price_on_request: boolean;

  // ─── Contact vendeur (dénormalisé pour accès public) ────────────────────────

  /** Téléphone visible publiquement */
  @Column({ name: 'contact_phone', type: 'varchar', nullable: true })
  contact_phone: string | null;

  /** Email visible publiquement */
  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contact_email: string | null;

  /** Localisation en texte libre */
  @Column({ name: 'location_label', type: 'varchar', nullable: true })
  location_label: string | null;

  // ─── Statut ────────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  // ─── Champs Bétail (LIVESTOCK) ─────────────────────────────────────────────

  /** Type d'animal: mouton, chèvre, bovin, volaille, etc. */
  @Column({ name: 'livestock_type', type: 'varchar', nullable: true })
  livestock_type: string | null;

  // ─── Traceability Attributes (Sprint 5) ────────────────────────────────────

  /** Origine florale (pour le miel) */
  @Column({ name: 'floral_origin', type: 'varchar', nullable: true })
  floral_origin: string | null;

  /** Certification sanitaire / conformité vaccinale */
  @Column({ name: 'sanitary_cert', type: 'boolean', nullable: true })
  sanitary_cert: boolean | null;

  /** Méthode d'élevage (plein air, hors-sol, etc.) */
  @Column({ name: 'breeding_method', type: 'varchar', nullable: true })
  breeding_method: string | null;

  /** Identifiant de traçabilité (référence apiary ou herd record) */
  @Column({ name: 'traceability_ref_id', type: 'varchar', nullable: true })
  traceability_ref_id: string | null;

  // ─── Champs Équipement (EQUIPMENT) ─────────────────────────────────────────

  @Column({
    name: 'equipment_condition',
    type: 'enum',
    enum: EquipmentCondition,
    nullable: true,
  })
  equipment_condition: EquipmentCondition | null;

  // ─── Champs Terrain (LAND) ─────────────────────────────────────────────────

  @Column({ name: 'land_size_ha', type: 'decimal', precision: 10, scale: 2, nullable: true })
  land_size_ha: number | null;

  @Column({ name: 'land_water_access', type: 'boolean', nullable: true })
  land_water_access: boolean | null;

  @Column({ name: 'land_soil_type', type: 'varchar', nullable: true })
  land_soil_type: string | null;

  @Column({ name: 'land_open_for_bidding', type: 'boolean', nullable: true })
  land_open_for_bidding: boolean | null;

  // ─── Inventaire & SMSA ─────────────────────────────────────────────────────

  /** Si true, la quantité est synchronisée depuis l'inventaire ZirIA */
  @Column({ name: 'linked_to_stock', type: 'boolean', default: false })
  linked_to_stock: boolean;

  @Column({ name: 'harvest_prediction_date', type: 'date', nullable: true })
  harvest_prediction_date: Date | null;

  @Column({ name: 'is_group_listing', type: 'boolean', default: false })
  is_group_listing: boolean;

  @Column({ name: 'cooperative_id', type: 'varchar', nullable: true })
  cooperative_id: string | null;

  @Column({ name: 'combined_member_ids', type: 'simple-array', nullable: true })
  combined_member_ids: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
