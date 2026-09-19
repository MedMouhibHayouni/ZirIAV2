import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Institution } from '../../institutions/entities/institution.entity';

export enum ConsentScope {
  IDENTITY = 'IDENTITY',
  PARCELLE = 'PARCELLE',
  CROP_DECLARATIONS = 'CROP_DECLARATIONS',
  DIAGNOSTICS = 'DIAGNOSTICS',
  DOSSIER_DOCUMENTS = 'DOSSIER_DOCUMENTS',
}

export enum ConsentStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

@Entity('data_sharing_consents')
export class DataSharingConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'jsonb' })
  scopes: ConsentScope[];

  @Column({ type: 'uuid', nullable: true })
  dossierId: string | null;

  @Column({ type: 'uuid', nullable: true })
  campaignId: string | null;

  @Column({ type: 'enum', enum: ConsentStatus, default: ConsentStatus.ACTIVE })
  status: ConsentStatus;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
