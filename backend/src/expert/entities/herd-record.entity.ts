import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('herd_records')
export class HerdRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'expert_id', type: 'uuid' })
  expert_id: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmer_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  species: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  breed: string | null;

  @Column({ type: 'integer', nullable: true })
  herd_size: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  daily_milk_yield_kg: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  birth_rate_pct: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  mortality_rate_pct: number | null;

  @Column({ type: 'date', nullable: true })
  last_visit_date: Date | null;

  @Column({ type: 'text', nullable: true })
  feed_program: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: false })
  performance_alert: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'expert_id' })
  expert: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;
}
