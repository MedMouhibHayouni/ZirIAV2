import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('consultation_additional_info')
export class ConsultationAdditionalInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'consultation_id', type: 'uuid' })
  consultation_id: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmer_id: string;

  @Column({ name: 'requested_chips', type: 'jsonb', nullable: true })
  requested_chips: string[] | null;

  @Column({ name: 'requested_text', type: 'text', nullable: true })
  requested_text: string | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submitted_at: Date | null;

  @Column({ name: 'additional_photos', type: 'jsonb', nullable: true })
  additional_photos: string[] | null;

  @Column({ name: 'additional_text', type: 'text', nullable: true })
  additional_text: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
