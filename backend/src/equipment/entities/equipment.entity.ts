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

/**
 * Matériel agricole disponible à la location.
 * Propriété d'un EQUIP_OWNER.
 */
@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  owner_id: string;

  /** Type de machine : tracteur, moissonneuse, pulvérisateur, charrue... */
  @Column()
  type: string;

  /** Tarif journalier en Dinars Tunisiens */
  @Column({ name: 'daily_rate_tnd', type: 'decimal', precision: 8, scale: 2 })
  daily_rate_tnd: number;

  /** Position GPS du matériel (garage ou champ) */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number;

  @Column({ default: true })
  available: boolean;

  /** Marque du matériel */
  @Column({ type: 'varchar', nullable: true })
  brand: string | null;

  /** Modèle */
  @Column({ type: 'varchar', nullable: true })
  model: string | null;

  /** Année de fabrication */
  @Column({ type: 'int', nullable: true })
  year: number | null;

  /** URL de la photo */
  @Column({ name: 'photo_url', type: 'varchar', nullable: true })
  photo_url: string | null;

  /** Tarif horaire optionnel */
  @Column({ name: 'hourly_rate_tnd', type: 'decimal', precision: 8, scale: 2, nullable: true })
  hourly_rate_tnd: number | null;

  /** Caution requise */
  @Column({ name: 'deposit_required', default: false })
  deposit_required: boolean;

  /** Montant de la caution */
  @Column({ name: 'deposit_amount_tnd', type: 'decimal', precision: 8, scale: 2, nullable: true })
  deposit_amount_tnd: number | null;

  /** Jours minimum de location */
  @Column({ name: 'min_rental_days', type: 'int', default: 1 })
  min_rental_days: number;

  /** Jours maximum de location */
  @Column({ name: 'max_rental_days', type: 'int', nullable: true })
  max_rental_days: number | null;

  /** Zone d'utilisation (gouvernorats) */
  @Column({ type: 'varchar', nullable: true })
  governorate: string | null;

  /** Note de condition (1-5, défini par admin) */
  @Column({ name: 'condition_rating', type: 'int', nullable: true })
  condition_rating: number | null;

  /** Description */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
