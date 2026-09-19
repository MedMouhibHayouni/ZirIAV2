import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Institution } from '../../institutions/entities/institution.entity';
import { InstitutionDossier } from '../../dossiers/entities/dossier.entity';
import { InstitutionMessageRead } from './institution-message-read.entity';

export enum MessageContext {
  INTERNAL = 'INTERNAL',
  DOSSIER = 'DOSSIER',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

@Entity('institution_messages')
@Index(['institutionId', 'createdAt'])
@Index(['senderId'])
@Index(['dossierId'])
@Index(['parentId'])
export class InstitutionMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: MessageContext, default: MessageContext.INTERNAL })
  context: MessageContext;

  @Column({ type: 'uuid', nullable: true })
  dossierId: string | null;

  @ManyToOne(() => InstitutionDossier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dossierId' })
  dossier: InstitutionDossier;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => InstitutionMessage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: InstitutionMessage;

  @OneToMany(() => InstitutionMessageRead, (r) => r.message)
  reads: InstitutionMessageRead[];

  @CreateDateColumn()
  createdAt: Date;
}
