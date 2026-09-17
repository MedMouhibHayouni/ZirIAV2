import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('vaccination_records')
export class VaccinationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'expert_id', type: 'uuid' })
  expert_id: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmer_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  species: string | null;

  @Column({ type: 'integer', nullable: true })
  animal_count: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  vaccine_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  batch_number: string | null;

  @Column({ type: 'date', nullable: true })
  vaccination_date: Date | null;

  @Column({ type: 'date', nullable: true })
  next_reminder_date: Date | null;

  @Column({ type: 'boolean', default: false })
  is_reminder_sent: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'expert_id' })
  expert: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;
}
