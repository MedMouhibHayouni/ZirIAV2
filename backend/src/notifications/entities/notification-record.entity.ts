import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';

@Entity('notification_records')
@Index(['user_id', 'is_read'])
export class NotificationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  user_id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ default: 'GENERAL' })
  type: string; // GENERAL | METEO | MALADIE | MARKETPLACE | EMPLOI | ALERTE

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ name: 'is_read', default: false })
  is_read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deleted_at: Date | null;
}
