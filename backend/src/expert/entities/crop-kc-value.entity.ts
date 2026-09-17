import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('crop_kc_values')
export class CropKcValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  crop_type: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  kc_ini: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  kc_mid: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  kc_end: number;
}
