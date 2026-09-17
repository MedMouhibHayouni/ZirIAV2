import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('commission_agreements')
export class CommissionAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'expert_id', type: 'uuid' })
  expert_id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplier_id: string;

  @Column({ name: 'commission_percentage', type: 'numeric', precision: 5, scale: 2 })
  commission_percentage: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
