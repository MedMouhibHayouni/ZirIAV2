import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InstitutionDossier } from './dossier.entity';
import { User } from '../../users/entities/user.entity';

@Entity('field_visits')
export class FieldVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  dossierId: string;

  @ManyToOne(() => InstitutionDossier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossierId' })
  dossier: InstitutionDossier;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column({ type: 'timestamptz' })
  visitDate: Date;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  gpsLatitude: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  gpsLongitude: number | null;

  @Column({ type: 'text' })
  reportText: string;

  @Column({ type: 'text', array: true, default: '{}' })
  photoUrls: string[];

  @Column({ type: 'varchar', length: 100, default: 'CONFORME' })
  outcome: string; // CONFORME, RESERVES, NON_CONFORME

  @CreateDateColumn()
  createdAt: Date;
}
