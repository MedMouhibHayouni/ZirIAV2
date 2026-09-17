import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('platform_config')
export class PlatformConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'varchar' })
  value: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
