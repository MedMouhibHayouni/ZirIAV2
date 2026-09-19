import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { InstitutionType, InstitutionLevel } from '../enums/institution.enums';
import { InstitutionMember } from './institution-member.entity';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: InstitutionType })
  type: InstitutionType;

  @Column({ type: 'enum', enum: InstitutionLevel, default: InstitutionLevel.REGIONAL })
  level: InstitutionLevel;

  @Column({ type: 'varchar', length: 100, nullable: true })
  governorate: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  openingHours: string | null;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location: any;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => InstitutionMember, (member) => member.institution)
  members: InstitutionMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
