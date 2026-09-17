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

export enum PurchaseRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('purchase_requests')
@Check(`"requested_quantity_tonnes" > 0`)
export class PurchaseRequest {
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

  @Column({ name: 'requested_quantity_tonnes', type: 'decimal', precision: 10, scale: 3 })
  requested_quantity_tonnes: number;

  @Column({
    type: 'enum',
    enum: PurchaseRequestStatus,
    default: PurchaseRequestStatus.PENDING,
  })
  status: PurchaseRequestStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
