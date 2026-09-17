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
import { Equipment } from './equipment.entity';

/**
 * Représente la réservation ou location d'un équipement agricole.
 * Liée à l'anti-chevauchement (No Overlap) strict sur l'agenda.
 */
@Entity('equipment_reservations')
export class EquipmentReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ name: 'equipment_id', type: 'uuid' })
  equipment_id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessee_id' })
  lessee: User;

  @Column({ name: 'lessee_id', type: 'uuid' })
  lessee_id: string;

  /** Date de début de réservation */
  @Column({ type: 'timestamp' })
  start_date: Date;

  /** Date de fin de réservation */
  @Column({ type: 'timestamp' })
  end_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_price_tnd: number;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
