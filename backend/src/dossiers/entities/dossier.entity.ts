import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Institution } from '../../institutions/entities/institution.entity';
import { DossierDocument } from './dossier-document.entity';
import { DossierStatusHistory } from './dossier-status-history.entity';

export enum DossierType {
  INVESTMENT = 'INVESTMENT',
  CREDIT = 'CREDIT',
  SUBSIDY_APPLICATION = 'SUBSIDY_APPLICATION',
  TECHNICAL_REQUEST = 'TECHNICAL_REQUEST',
}

export enum InvestmentStatus {
  DRAFT = 'DRAFT',
  PENDING_FARMER_ACCEPTANCE = 'PENDING_FARMER_ACCEPTANCE',
  SUBMITTED = 'SUBMITTED',
  INCOMPLETE = 'INCOMPLETE',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  CLOSED = 'CLOSED',
}

@Entity('institution_dossiers')
export class InstitutionDossier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  referenceNumber: string;

  @Column({ type: 'enum', enum: DossierType })
  type: DossierType;

  @Column({ type: 'uuid' })
  farmerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column({ type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'uuid', nullable: true })
  assignedAgentId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignedAgentId' })
  assignedAgent: User | null;

  @Column({ type: 'varchar', length: 50, default: InvestmentStatus.SUBMITTED })
  status: string;

  @Column({ type: 'varchar', length: 150 })
  programName: string;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 0.000 })
  requestedAmountTnd: number;

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  approvedAmountTnd: number | null;

  @Column({ type: 'text', nullable: true })
  projectSummary: string | null;

  @Column({ type: 'text', nullable: true })
  internalAgentNotes: string | null;

  @Column({ type: 'integer', default: 0 })
  daysInCurrentStatus: number;

  @Column({ type: 'boolean', default: false })
  isOverdue: boolean;

  @OneToMany(() => DossierDocument, (doc) => doc.dossier, { cascade: true })
  documents: DossierDocument[];

  @OneToMany(() => DossierStatusHistory, (history) => history.dossier, { cascade: true })
  statusHistory: DossierStatusHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
