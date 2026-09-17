import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  delegation: string;

  @Column({ type: 'varchar', length: 100 })
  governorate: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  center_lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  center_lng: number;

  @Column({ name: 'ambassador_id', type: 'uuid', nullable: true })
  ambassador_id: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
