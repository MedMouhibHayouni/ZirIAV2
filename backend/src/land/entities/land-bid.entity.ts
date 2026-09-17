import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { LandAuction } from './land-auction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('land_bids')
@Index(['auction_id', 'amount_tnd'])
@Check(`"amount_tnd" > 0`)
export class LandBid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LandAuction)
  @JoinColumn({ name: 'auction_id' })
  auction: LandAuction;

  @Column({ name: 'auction_id' })
  auction_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ name: 'amount_tnd', type: 'decimal', precision: 12, scale: 3 })
  amount_tnd: number;

  @Column({ name: 'is_winning', type: 'boolean', default: false })
  is_winning: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
