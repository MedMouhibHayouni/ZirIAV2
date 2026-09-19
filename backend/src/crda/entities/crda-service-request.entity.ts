import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity';
import { User } from '../../users/entities/user.entity';

export enum ServiceRequestType {
  WATER_AUTHORIZATION = 'WATER_AUTHORIZATION',
  TECHNICAL_VISIT = 'TECHNICAL_VISIT',
  LAND_REGULARIZATION = 'LAND_REGULARIZATION',
  INPUT_SUBSIDY = 'INPUT_SUBSIDY',
  PHYTO_ASSISTANCE = 'PHYTO_ASSISTANCE',
}

export enum ServiceRequestStatus {
  RECEIVED = 'RECEIVED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

@Entity('crda_service_requests')
export class CrdaServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticketNumber: string;

  @Column({ type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'uuid' })
  farmerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column({ type: 'uuid', nullable: true })
  assignedAgentId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignedAgentId' })
  assignedAgent: User | null;

  @Column({ type: 'varchar', length: 50 })
  type: ServiceRequestType;

  @Column({ type: 'varchar', length: 150 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, default: ServiceRequestStatus.RECEIVED })
  status: ServiceRequestStatus;

  @Column({ type: 'text', nullable: true })
  agentResolutionReport: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
