import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('vaccine_types')
export class VaccineType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  species: string;

  @Column()
  disease_prevented: string;

  @Column()
  injection_method: string;

  @Column({ type: 'integer' })
  age_weeks: number;

  @Column({ type: 'integer' })
  interval_months: number;
}
