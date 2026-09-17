import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Représente une coopérative agricole SMSA dans la région de Kasserine.
 * Gérée par un COOP_PRESIDENT, regroupe plusieurs agriculteurs.
 */
@Entity('cooperatives')
export class Cooperative {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Président de la coopérative */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'president_id' })
  president: User;

  @Column({ name: 'president_id' })
  president_id: string;

  @Column()
  name: string;

  /** Code SMSA officiel tunisien */
  @Column({ name: 'smsa_code', type: 'varchar', nullable: true })
  smsa_code: string;

  @Column({ name: 'location_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  location_lat: number;

  @Column({ name: 'location_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  location_lng: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
