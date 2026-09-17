import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('driver_location_updates')
@Index(['contract_id', 'recorded_at'])
export class DriverLocationUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contract_id: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driver_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recorded_at: Date;
}
