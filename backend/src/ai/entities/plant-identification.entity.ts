import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('plant_identifications')
@Index(['ip_address'])
@Index(['user_id'])
export class PlantIdentification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ip_address: string | null;

  @Column({ name: 'photo_url', type: 'varchar' })
  photo_url: string;

  @Column({ name: 'plant_name_fr', type: 'varchar' })
  plant_name_fr: string;

  @Column({ name: 'plant_name_ar', type: 'varchar' })
  plant_name_ar: string;

  @Column({ name: 'plant_name_lat', type: 'varchar' })
  plant_name_lat: string;

  @Column({ name: 'description_fr', type: 'text' })
  description_fr: string;

  @Column({ name: 'description_darija', type: 'text' })
  description_darija: string;

  @Column({ name: 'care_tips', type: 'jsonb' })
  care_tips: string[];

  @Column({ name: 'agricultural_relevance', type: 'text' })
  agricultural_relevance: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
