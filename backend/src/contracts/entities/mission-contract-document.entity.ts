import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { MissionContract } from './mission-contract.entity';
import { DocumentType } from './contract-enums';

@Entity('mission_contract_documents')
@Index(['contract_id'])
export class MissionContractDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MissionContract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: MissionContract;

  @Column({ name: 'contract_id', type: 'uuid' })
  contract_id: string;

  @Column({ name: 'document_type', type: 'enum', enum: DocumentType })
  document_type: DocumentType;

  @Column({ name: 'file_url', type: 'varchar' })
  file_url: string;

  @Column({ name: 'generated_at', type: 'timestamptz', default: () => 'NOW()' })
  generated_at: Date;

  @Column({ name: 'generated_by_id', type: 'uuid', nullable: true })
  generated_by_id: string | null;
}
