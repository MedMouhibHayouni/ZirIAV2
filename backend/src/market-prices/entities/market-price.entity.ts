import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('market_prices')
export class MarketPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'crop_type' })
  crop_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  price_min: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  price_max: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  price_avg: number;

  @Column({ default: 'TND/kg' })
  unit: string;

  @Column({ name: 'market_name', default: 'Marché de Gros Kasserine' })
  market_name: string;

  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
