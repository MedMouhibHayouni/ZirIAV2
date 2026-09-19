import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Institution } from './institution.entity';

@Entity('institution_project_calls')
export class ProjectCall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 100 })
  sector: string;

  @Column({ type: 'timestamptz' })
  deadline: Date;

  @Column({ type: 'varchar', length: 20 })
  grantRate: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'boolean', default: false })
  publishedToZirFeed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
