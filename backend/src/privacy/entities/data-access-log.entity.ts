import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Institution } from '../../institutions/entities/institution.entity';

@Entity('data_access_log')
export class DataAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  actorUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorUserId' })
  actorUser: User;

  @Column({ type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'uuid' })
  farmerId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column({ type: 'varchar', length: 50 })
  scope: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  recordId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'READ' })
  action: string; // READ or WRITE

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
