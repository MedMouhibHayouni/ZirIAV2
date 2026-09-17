import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('diagnosis_resolution_log')
export class DiagnosisResolutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'varchar', length: 255 })
  request_id: string;

  @Column({ name: 'resolved_via', type: 'varchar', length: 50 })
  resolved_via: 'local' | 'gemini' | 'expert_escalation';

  @Column({ name: 'predicted_class', type: 'varchar', length: 120 })
  predicted_class: string;

  @Column({ name: 'confidence', type: 'decimal', precision: 5, scale: 4 })
  confidence: number;

  @Column({ name: 'margin', type: 'decimal', precision: 5, scale: 4, default: 0 })
  margin: number;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
