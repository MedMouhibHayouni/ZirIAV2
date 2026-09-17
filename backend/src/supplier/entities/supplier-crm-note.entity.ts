import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupplierCrmClient } from './supplier-crm-client.entity';
import { ProductOrder } from './product-order.entity';

export enum NoteType {
  NOTE = 'NOTE',
  APPEL = 'APPEL',
  VISITE = 'VISITE',
  RELANCE = 'RELANCE',
  COMMANDE = 'COMMANDE',
  PAIEMENT = 'PAIEMENT'
}

@Entity('supplier_crm_notes')
export class SupplierCrmNote {
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

  @Column({ type: 'enum', enum: NoteType, default: NoteType.NOTE })
  note_type: NoteType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @ManyToOne(() => ProductOrder, { eager: false, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'related_order_id' })
  related_order: ProductOrder | null;

  @Column({ name: 'related_order_id', type: 'uuid', nullable: true })
  related_order_id: string | null;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  created_by_id: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
