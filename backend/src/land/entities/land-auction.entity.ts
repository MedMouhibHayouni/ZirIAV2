import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, Check } from 'typeorm';
import { Parcel } from '../../parcels/entities/parcel.entity';

export enum AuctionStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED'
}

@Entity('land_auctions')
@Check(`"reserve_price_secret" >= 0`)
@Check(`"min_increment" > 0`)
export class LandAuction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Parcel)
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'parcel_id' })
  parcel_id: string;

  @Column({ name: 'reserve_price_secret', type: 'decimal', precision: 12, scale: 3 })
  reserve_price_secret: number;

  @Column({ name: 'min_increment', type: 'decimal', precision: 10, scale: 3 })
  min_increment: number;

  @Column({ name: 'end_at', type: 'timestamp' })
  end_at: Date;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.SCHEDULED })
  status: AuctionStatus;

  @Column({ name: 'auto_extend_minutes', type: 'int', default: 5 })
  auto_extend_minutes: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
