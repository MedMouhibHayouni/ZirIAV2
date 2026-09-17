import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Inventaire de stock (Intrants, Semences, Récoltes) lié à un utilisateur.
 * Modèle de données utilisé dans la chaine de valeur ERP (Marketplace).
 */
@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  owner_id: string;

  @Column({ name: 'crop_type', type: 'varchar' })
  crop_type: string;

  /** Quantité en stock en tonnes */
  @Column({ name: 'quantity_tonnes', type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantity_tonnes: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
