import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Check,
} from 'typeorm';
import { MarketplaceListing } from './marketplace-listing.entity';
import { User } from '../../users/entities/user.entity';

export enum NegotiationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity('price_negotiations')
@Check(`"proposed_price_per_kg" >= 0`)
export class PriceNegotiation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MarketplaceListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: MarketplaceListing;

  @Column({ name: 'listing_id' })
  listing_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'buyer_id' })
  buyer_id: string;

  @Column({ name: 'proposed_price_per_kg', type: 'decimal', precision: 8, scale: 3 })
  proposed_price_per_kg: number;

  @Column({
    type: 'enum',
    enum: NegotiationStatus,
    default: NegotiationStatus.PENDING,
  })
  status: NegotiationStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
