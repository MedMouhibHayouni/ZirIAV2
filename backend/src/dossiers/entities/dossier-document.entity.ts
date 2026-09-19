import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InstitutionDossier } from './dossier.entity';

export enum DocumentReviewStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity('dossier_documents')
export class DossierDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  dossierId: string;

  @ManyToOne(() => InstitutionDossier, (dossier) => dossier.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossierId' })
  dossier: InstitutionDossier;

  @Column({ type: 'varchar', length: 150 })
  documentName: string;

  @Column({ type: 'varchar', length: 50, default: 'PDF' })
  documentType: string;

  @Column({ type: 'text', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'enum', enum: DocumentReviewStatus, default: DocumentReviewStatus.PENDING })
  reviewStatus: DocumentReviewStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
