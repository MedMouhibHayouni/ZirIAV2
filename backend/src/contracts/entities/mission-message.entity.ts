import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { MissionContract } from './mission-contract.entity';
import { ContractMessageType } from './contract-enums';

@Entity('mission_messages')
@Index(['contract_id', 'created_at'])
export class MissionMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MissionContract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: MissionContract;

  @Column({ name: 'contract_id', type: 'uuid' })
  contract_id: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  sender_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'attachment_url', type: 'varchar', nullable: true })
  attachment_url: string | null;

  @Column({ type: 'enum', enum: ContractMessageType, default: ContractMessageType.TEXT })
  message_type: ContractMessageType;

  @Column({ name: 'offer_amount_tnd', type: 'decimal', precision: 12, scale: 3, nullable: true })
  offer_amount_tnd: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
