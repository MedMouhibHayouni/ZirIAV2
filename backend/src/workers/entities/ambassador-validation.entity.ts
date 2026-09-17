import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('ambassador_validations')
@Index(['worker_id'])
export class AmbassadorValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  worker_id: string;

  @Column({ name: 'ambassador_id', type: 'uuid' })
  ambassador_id: string;

  @Column({ name: 'validated_at', type: 'timestamptz', default: () => 'NOW()' })
  validated_at: Date;

  @Column({ name: 'certification_names', type: 'jsonb', default: '[]' })
  certification_names: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
