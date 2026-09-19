import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Institution } from './institution.entity';

export type AppointmentStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';

@Entity('institution_appointments')
export class InstitutionAppointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'varchar', length: 150 })
  farmerName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  farmerPhone: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 30 })
  timeSlot: string;

  @Column({ type: 'varchar', length: 255 })
  topic: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  cancelReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
