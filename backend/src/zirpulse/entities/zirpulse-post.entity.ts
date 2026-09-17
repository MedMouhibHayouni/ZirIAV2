import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Statut du traitement du post ZirPulse */
export enum ZirpulseStatus {
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

/**
 * Post vocal ZirPulse — enregistrement audio analysé par Gemini.
 * Le moteur extrait une intention structurée ({"intent":"SELL","crop":"Tomate","qty":2})
 * et pré-remplit automatiquement un DTO MarketplaceListing pour validation.
 *
 * Pipeline : audio_url → Gemini → transcript + intent_json → pre_filled_listing_dto
 */
@Entity('zirpulse_posts')
export class ZirpulsePost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'reporter_id' })
  reporter_id: string;

  /** URL de l'audio uploadé (Cloudinary audio) */
  @Column({ name: 'audio_url' })
  audio_url: string;

  /**
   * Transcription textuelle de l'audio générée par Gemini.
   * Ex: "Ena 3andi zuz tuns batat nemshi bish nbiya..."
   */
  @Column({ type: 'text', nullable: true })
  transcript: string | null;

  /**
   * Intention structurée extraite par Gemini.
   * Format: { intent: "SELL", crop: "Tomate", qty: 2, price_per_kg: 1.5, unit: "tonne" }
   */
  @Column({ name: 'intent_json', type: 'jsonb', nullable: true })
  intent_json: Record<string, unknown> | null;

  /**
   * DTO Marketplace pré-rempli prêt à être confirmé par l'utilisateur.
   * Format: CreateMarketplaceListingDto (crop_type, quantity_tonnes, price_per_kg, status: DRAFT)
   */
  @Column({ name: 'pre_filled_listing_dto', type: 'jsonb', nullable: true })
  pre_filled_listing_dto: Record<string, unknown> | null;

  /**
   * Tags extraits automatiquement par Gemini.
   * Ex: ["tomate", "vente", "kasserine"]
   */
  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  /** Latitude GPS au moment de l'enregistrement */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number | null;

  /** Longitude GPS */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number | null;

  @Column({
    type: 'enum',
    enum: ZirpulseStatus,
    default: ZirpulseStatus.PROCESSING,
  })
  status: ZirpulseStatus;

  @Column({ default: 0 })
  likes: number;

  /** Message d'erreur si le traitement Gemini échoue */
  @Column({ name: 'error_message', type: 'varchar', nullable: true })
  error_message: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
