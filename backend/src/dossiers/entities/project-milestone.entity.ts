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

export enum MilestoneStatus {
  ON_TRACK = 'ON_TRACK',
  DELAYED = 'DELAYED',
  AT_RISK = 'AT_RISK',
  DONE = 'DONE',
}

@Entity('project_milestones')
export class ProjectMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  dossierId: string;

  @ManyToOne(() => InstitutionDossier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossierId' })
  dossier: InstitutionDossier;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date' })
  targetDate: string;

  @Column({ type: 'date', nullable: true })
  actualDate: string | null;

  @Column({ type: 'varchar', length: 50, default: MilestoneStatus.ON_TRACK })
  status: MilestoneStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
