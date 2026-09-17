import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MarketplaceListing } from '../../marketplace/entities/marketplace-listing.entity';

/** Statut d'une mise en relation B2B */
export enum ConnectionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

/**
 * Enregistrement d'une mise en relation B2B.
 * Créée lorsqu'un B2B_BUYER exprime son intérêt pour une annonce.
 * Le vendeur (COOP_PRESIDENT) reçoit une notification push et confirme/rejette.
 */
@Entity('marketplace_connections')
export class MarketplaceConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** L'annonce concernée */
  @ManyToOne(() => MarketplaceListing, { eager: false })
  @JoinColumn({ name: 'listing_id' })
  listing: MarketplaceListing;

  @Column({ name: 'listing_id' })
  listing_id: string;

  /** L'acheteur B2B qui exprime son intérêt */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'buyer_id' })
  buyer_id: string;

  /** Le vendeur (Président de coopérative) */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'seller_id' })
  seller_id: string;

  @Column({
    type: 'enum',
    enum: ConnectionStatus,
    default: ConnectionStatus.PENDING,
  })
  status: ConnectionStatus;

  /** Message optionnel de l'acheteur */
  @Column({ nullable: true, type: 'text' })
  message: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
