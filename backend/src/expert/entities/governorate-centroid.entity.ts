import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('governorate_centroids')
export class GovernorateCentroid {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  governorate: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;
}
