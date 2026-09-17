import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum NegotiationStatus {
  ACTIVE = 'ACTIVE',
  AGREED = 'AGREED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

@Entity('mission_negotiations')
@Index(['farmer_id', 'worker_id'])
export class MissionNegotiation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mission_offer_id', type: 'uuid' })
  mission_offer_id: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmer_id: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  worker_id: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'round_count', type: 'int', default: 0 })
  round_count: number;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closed_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
