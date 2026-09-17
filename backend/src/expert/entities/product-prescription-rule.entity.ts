import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('product_prescription_rules')
export class ProductPrescriptionRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  disease_name: string;

  @Column()
  allowed_product: string;

  @Column()
  default_dosage: string;

  @Column()
  default_application_method: string;

  @Column({ type: 'integer', default: 0 })
  pre_harvest_days: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
