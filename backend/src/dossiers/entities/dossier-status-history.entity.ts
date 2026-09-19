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

@Entity('dossier_status_history')
export class DossierStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  dossierId: string;

  @ManyToOne(() => InstitutionDossier, (dossier) => dossier.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossierId' })
  dossier: InstitutionDossier;

  @Column({ type: 'varchar', length: 50, nullable: true })
  previousStatus: string | null;

  @Column({ type: 'varchar', length: 50 })
  newStatus: string;

  @Column({ type: 'uuid' })
  changedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser: User;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
