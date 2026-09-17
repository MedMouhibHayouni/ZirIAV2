import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { MarketplaceListing } from './marketplace-listing.entity';

@Entity('marketplace_price_history')
export class MarketplacePriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MarketplaceListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: MarketplaceListing;

  @Column({ name: 'listing_id' })
  listing_id: string;

  @Column({ name: 'old_price_per_kg', type: 'decimal', precision: 8, scale: 3 })
  old_price_per_kg: number;

  @Column({ name: 'new_price_per_kg', type: 'decimal', precision: 8, scale: 3 })
  new_price_per_kg: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
