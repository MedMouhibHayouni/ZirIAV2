import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum RelationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum RequestedBy {
  FARMER = 'FARMER',
  EXPERT = 'EXPERT',
}

@Entity('expert_farmer_relations')
@Unique(['expert_id', 'farmer_id'])
export class ExpertFarmerRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  expert_id: string;

  @Column({ type: 'uuid' })
  farmer_id: string;

  @Column({ type: 'enum', enum: RelationStatus, default: RelationStatus.PENDING })
  status: RelationStatus;

  @Column({ type: 'enum', enum: RequestedBy })
  requested_by: RequestedBy;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'expert_id' })
  expert: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;
}
