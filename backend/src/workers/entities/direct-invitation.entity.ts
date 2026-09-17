import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum DirectInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

@Entity('direct_invitations')
@Index(['farmer_id'])
@Index(['worker_profile_id'])
export class DirectInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmer_id: string;

  @Column({ name: 'worker_profile_id', type: 'uuid' })
  worker_profile_id: string;

  @Column({ name: 'job_offer_id', type: 'uuid', nullable: true })
  job_offer_id: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'enum', enum: DirectInvitationStatus, default: DirectInvitationStatus.PENDING })
  status: DirectInvitationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
