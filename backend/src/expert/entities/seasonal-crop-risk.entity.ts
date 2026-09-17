import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('seasonal_crop_risks')
export class SeasonalCropRisk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  crop_type: string;

  @Column({ type: 'integer' })
  month: number;

  @Column()
  risk_level: string;

  @Column({ type: 'text' })
  risk_description: string;
}
