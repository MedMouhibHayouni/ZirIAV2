import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn,
} from 'typeorm';
import { DriverProfile } from './driver-profile.entity';

/**
 * Enregistrement d'un événement de position GPS.
 * Conservé 90 jours, append-only.
 */
@Entity('gps_tracking_events')
@Index(['driver_profile_id', 'mission_id', 'recorded_at'])
export class GpsTrackingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_profile_id' })
  driver_profile_id: string;

  @ManyToOne(() => DriverProfile, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'driver_profile_id' })
  driver_profile: DriverProfile;

  /** ID de la mission associée (transport_request.id) */
  @Column({ name: 'mission_id', type: 'varchar', nullable: true })
  mission_id: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ name: 'speed_kmh', type: 'decimal', precision: 6, scale: 2, nullable: true })
  speed_kmh: number | null;

  @Column({ name: 'bearing_degrees', type: 'decimal', precision: 6, scale: 2, nullable: true })
  bearing_degrees: number | null;

  @Column({ name: 'accuracy_meters', type: 'decimal', precision: 8, scale: 2, nullable: true })
  accuracy_meters: number | null;

  /** Heure de l'appareil (device time) */
  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recorded_at: Date;

  /** Heure de réception serveur */
  @CreateDateColumn({ name: 'server_received_at' })
  server_received_at: Date;
}
