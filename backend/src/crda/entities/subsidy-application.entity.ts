import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SubsidyProgram } from './subsidy-program.entity';
import { User } from '../../users/entities/user.entity';

export enum ApplicationReviewState {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('subsidy_applications')
export class SubsidyApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  programId: string;

  @ManyToOne(() => SubsidyProgram, (p) => p.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'programId' })
  program: SubsidyProgram;

  @Column({ type: 'uuid' })
  farmerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  requestedAmountTnd: number;

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  grantedAmountTnd: number | null;

  @Column({ type: 'varchar', length: 50, default: ApplicationReviewState.PENDING })
  status: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
