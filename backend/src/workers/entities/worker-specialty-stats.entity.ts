import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { WorkerProfile } from './worker-profile.entity';

@Entity('worker_specialty_stats')
@Index(['worker_id', 'specialty_code'], { unique: true })
export class WorkerSpecialtyStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_id' })
  worker_id: string;

  @ManyToOne(() => WorkerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker: WorkerProfile;

  @Column({ name: 'specialty_code', type: 'varchar', length: 50 })
  specialty_code: string;

  @Column({ name: 'missions_count', type: 'int', default: 0 })
  missions_count: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
