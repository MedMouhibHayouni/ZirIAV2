import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('name_dictionary')
export class NameDictionary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'varchar' })
  key: string;

  @Column({ name: 'name_fr', type: 'varchar' })
  name_fr: string;

  @Column({ name: 'name_ar', type: 'varchar' })
  name_ar: string;

  @Column({ name: 'name_lat', type: 'varchar' })
  name_lat: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
