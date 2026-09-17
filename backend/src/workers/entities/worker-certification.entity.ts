import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { WorkerProfile } from './worker-profile.entity';
import { User } from '../../users/entities/user.entity';
import { CertificateType } from './certificate-type.enum';

export enum CertificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Entity('worker_certifications')
export class WorkerCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_profile_id' })
  worker_profile_id: string;

  @ManyToOne(() => WorkerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_profile_id' })
  workerProfile: WorkerProfile;

  @Column({ name: 'cert_type', type: 'varchar', length: 50, default: CertificateType.AUTRE })
  cert_type: string;

  @Column({ name: 'certification_name', type: 'varchar', length: 255 })
  certification_name: string;

  @Column({ name: 'institution_name', type: 'varchar', length: 255, nullable: true })
  institution_name: string | null;

  @Column({ name: 'issuing_organization', type: 'varchar', length: 255, nullable: true })
  issuing_organization: string | null;

  @Column({ name: 'year_obtained', type: 'int', nullable: true })
  year_obtained: number | null;

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issued_date: string | Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiry_date: string | Date | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'document_url', type: 'varchar', nullable: true })
  document_url: string | null;

  @Column({ name: 'is_public', default: true })
  is_public: boolean;

  @Column({ name: 'is_verified_by_ambassador', default: false })
  is_verified_by_ambassador: boolean;

  @Column({ name: 'verification_status', type: 'varchar', length: 20, default: CertificationStatus.PENDING })
  verification_status: string;

  @Column({ name: 'verified_by_id', type: 'uuid', nullable: true })
  verified_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'verified_by_id' })
  verifiedBy: User | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verified_at: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejection_reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
