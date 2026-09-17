import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Inventory } from './inventory.entity';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inventory, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ name: 'inventory_id' })
  inventory_id: string;

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type: MovementType;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
