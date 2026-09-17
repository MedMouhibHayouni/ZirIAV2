import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StorageRoom, StoragePricingUnit } from './storage-room.entity';
import { User } from '../../users/entities/user.entity';

export enum StorageReservationStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRMEE = 'CONFIRMEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}

export enum StoragePaymentStatus {
  A_JOUR = 'A_JOUR',
  EN_RETARD = 'EN_RETARD',
  PAYE_PARTIEL = 'PAYE_PARTIEL',
}

@Entity('storage_reservations')
export class StorageReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'uuid' })
  room_id: string;

  @ManyToOne(() => StorageRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: StorageRoom;

  @Column({ name: 'renter_id', type: 'uuid', nullable: true })
  renter_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'renter_id' })
  renter: User | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  occupied_capacity: number;

  @Column({ type: 'enum', enum: StoragePricingUnit, default: StoragePricingUnit.M3 })
  occupied_unit: StoragePricingUnit;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date | null;

  @Column({ type: 'enum', enum: StorageReservationStatus, default: StorageReservationStatus.EN_ATTENTE })
  status: StorageReservationStatus;

  @Column({ type: 'enum', enum: StoragePaymentStatus, default: StoragePaymentStatus.A_JOUR })
  payment_status: StoragePaymentStatus;

  @Column({ type: 'int', default: 0 })
  unpaid_months_count: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  total_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  amount_paid_tnd: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  amount_due_tnd: number;

  @Column({ type: 'timestamp', nullable: true })
  next_payment_due_date: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  initial_occupant_label: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  client_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  client_phone: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
