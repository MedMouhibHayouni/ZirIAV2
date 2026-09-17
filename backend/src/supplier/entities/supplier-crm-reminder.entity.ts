import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupplierCrmClient } from './supplier-crm-client.entity';

@Entity('supplier_crm_reminders')
export class SupplierCrmReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => SupplierCrmClient, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crm_client_id' })
  crm_client: SupplierCrmClient;

  @Column({ name: 'crm_client_id', type: 'uuid' })
  crm_client_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date' })
  reminder_date: Date;

  @Column({ type: 'boolean', default: false })
  is_completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
