import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StorageFacility } from './storage-facility.entity';

export enum StoragePricingMode {
  PAR_M3_JOUR = 'PAR_M3_JOUR',
  FORFAIT_PERIODE = 'FORFAIT_PERIODE',
}

export enum StoragePricingUnit {
  M3 = 'M3',
  TONNE = 'TONNE',
  KG = 'KG',
  LITRE = 'LITRE',
  CAJOT = 'CAJOT',
  PALETTE = 'PALETTE',
  FORFAIT = 'FORFAIT',
}

export enum ElectricityBillingMode {
  FORFAIT_MENSUEL = 'FORFAIT_MENSUEL',
  TARIF_KWH = 'TARIF_KWH',
}

@Entity('storage_rooms')
export class StorageRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'facility_id', type: 'uuid' })
  facility_id: string;

  @ManyToOne(() => StorageFacility, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: StorageFacility;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  room_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  capacity_m3: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacity_tonnes: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  total_capacity: number;

  @Column({ type: 'enum', enum: StoragePricingUnit, default: StoragePricingUnit.M3 })
  pricing_unit: StoragePricingUnit;

  @Column({ type: 'enum', enum: StoragePricingMode, default: StoragePricingMode.PAR_M3_JOUR })
  pricing_mode: StoragePricingMode;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  price_per_m3_day: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  flat_price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true, default: 1.5 })
  unit_price: number | null;

  @Column({ type: 'enum', enum: ElectricityBillingMode, default: ElectricityBillingMode.FORFAIT_MENSUEL })
  electricity_billing_mode: ElectricityBillingMode;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true, default: 0 })
  electricity_rate: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 15 })
  compressor_power_kw: number;

  @Column({ type: 'varchar', length: 20, default: '#0ea5e9' })
  color_hex: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  equipment_badges: string[];

  @Column({ type: 'int', default: 0 })
  grid_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
