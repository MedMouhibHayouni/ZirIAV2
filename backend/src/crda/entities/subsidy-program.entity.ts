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
import { Institution } from '../../institutions/entities/institution.entity';
import { SubsidyApplication } from './subsidy-application.entity';

@Entity('subsidy_programs')
export class SubsidyProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text' })
  criteria: string;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  totalBudgetTnd: number;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 0.000 })
  allocatedBudgetTnd: number;

  @Column({ type: 'date' })
  applicationWindowStart: string;

  @Column({ type: 'date' })
  applicationWindowEnd: string;

  @Column({ type: 'boolean', default: true })
  isOpen: boolean;

  @Column({ type: 'boolean', default: false })
  beneficiariesPublished: boolean;

  @OneToMany(() => SubsidyApplication, (a) => a.program, { cascade: true })
  applications: SubsidyApplication[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
