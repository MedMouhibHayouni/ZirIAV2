import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { InstitutionMessage } from './institution-message.entity';
import { InstitutionMember } from '../../institutions/entities/institution-member.entity';

@Entity('institution_message_reads')
@Unique(['messageId', 'memberId'])
export class InstitutionMessageRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  messageId: string;

  @ManyToOne(() => InstitutionMessage, (m) => m.reads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: InstitutionMessage;

  @Column({ type: 'uuid' })
  memberId: string;

  @ManyToOne(() => InstitutionMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: InstitutionMember;

  @CreateDateColumn()
  readAt: Date;
}
