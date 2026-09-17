import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExpertType } from '../../common/enums/expert-type.enum';

@Entity('ai_model_feedbacks')
export class AiModelFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prediction_id', type: 'uuid' })
  prediction_id: string;

  @ManyToOne(() => User) // L'expert CRDA
  @JoinColumn({ name: 'expert_id' })
  expert: User;

  @Column({ name: 'expert_id' })
  expert_id: string;

  @Column({ name: 'is_correct', type: 'boolean' })
  is_correct: boolean;

  @Column({ name: 'corrected_value_jsonb', type: 'jsonb', nullable: true })
  corrected_value_jsonb: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ name: 'expert_validated', type: 'boolean', default: false })
  expert_validated: boolean;

  @Column({ name: 'validating_expert_type', type: 'enum', enum: ExpertType, nullable: true })
  validating_expert_type: ExpertType | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
