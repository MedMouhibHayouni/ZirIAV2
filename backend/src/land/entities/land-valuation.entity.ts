import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, DeleteDateColumn, Check } from 'typeorm';
import { Parcel } from '../../parcels/entities/parcel.entity';

@Entity('land_valuations')
@Check(`"estimated_value_tnd" >= 0`)
export class LandValuation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Parcel)
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'parcel_id' })
  parcel_id: string;

  @Column({ name: 'estimated_value_tnd', type: 'decimal', precision: 12, scale: 3 })
  estimated_value_tnd: number;

  @Column({ type: 'jsonb' })
  factors_jsonb: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
