import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('predictions')
@Index(['domain', 'target_entity_id'])
export class Prediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  domain: string; // e.g., 'MARKET_PRICE', 'HARVEST', 'DISEASE'

  @Column({ name: 'target_entity_id', type: 'uuid' })
  target_entity_id: string;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4 })
  confidence_score: number;

  @Column({ name: 'prediction_value_jsonb', type: 'jsonb' })
  prediction_value_jsonb: Record<string, any>;

  @Column({ name: 'actual_value_jsonb', type: 'jsonb', nullable: true })
  actual_value_jsonb: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
