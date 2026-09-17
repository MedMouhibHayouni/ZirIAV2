import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('supplier_plan_features')
export class SupplierPlanFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  plan_code: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  price_tnd_monthly: number;

  @Column({ type: 'varchar' })
  name_fr: string;

  @Column({ type: 'text' })
  description_fr: string;

  @Column({ type: 'jsonb' })
  features_json: string[];
}
