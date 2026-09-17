import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { ExpertType } from '../../common/enums/expert-type.enum';
import { FarmerActivityType } from '../../common/enums/farmer-activity-type.enum';
import { IsEmail, IsOptional } from 'class-validator';
import { Cooperative } from '../../cooperatives/entities/cooperative.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  @IsEmail()
  @IsOptional()
  email: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  @IsOptional()
  phone: string | null;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  governorate: string;

  @Column({ type: 'varchar', nullable: true })
  delegation: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.FARMER_AMBASSADOR })
  role: Role;

  @ManyToOne(() => Cooperative, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: Cooperative;

  @Column({ name: 'cooperative_id', type: 'uuid', nullable: true })
  cooperative_id: string;

  @Column({ name: 'password_hash' })
  password_hash: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ name: 'is_banned', default: false })
  is_banned: boolean;

  @Column({ name: 'fcm_token', nullable: true, type: 'varchar' })
  fcm_token: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number | null;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location: string | null;

  // ── Zone & Privacy ───────────────────────────────────────────────────────────
  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zone_id: string | null;

  @Column({ name: 'is_crda_registered', default: false })
  is_crda_registered: boolean;

  @Column({ name: 'crda_district', type: 'varchar', length: 100, nullable: true })
  crda_district: string | null;

  @Column({ name: 'crda_zone_id', type: 'uuid', nullable: true })
  crda_zone_id: string | null;

  @Column({ name: 'privacy_level', type: 'varchar', length: 20, default: 'SEMI_PUBLIC' })
  privacy_level: 'ANONYMOUS' | 'SEMI_PUBLIC' | 'OPEN';

  @Column({ name: 'registered_by_ambassador_id', type: 'uuid', nullable: true })
  registered_by_ambassador_id: string | null;

  // ── Supplier Vitrine Fields ──────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 255, nullable: true })
  business_name: string | null;

  @Column({ type: 'text', nullable: true })
  business_description: string | null;

  @Column({ type: 'varchar', nullable: true })
  vitrine_photo_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  vitrine_cover_url: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  vitrine_theme_color: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'dark' })
  vitrine_theme_mode: string | null;

  @Column({ type: 'varchar', nullable: true })
  website_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebook_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  whatsapp_number: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, default: 0 })
  average_rating: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  total_reviews: number | null;

  @Column({ type: 'boolean', default: false })
  is_vitrine_published: boolean;

  // ── Global Profile Settings & Localization ──
  @Column({ name: 'profile_picture_url', type: 'varchar', nullable: true })
  profile_picture_url: string | null;

  @Column({ name: 'language', type: 'varchar', length: 10, default: 'fr', nullable: true })
  language: string | null;

  @Column({ name: 'speciality', type: 'varchar', nullable: true })
  speciality: string | null;

  @Column({ name: 'expert_type', type: 'enum', enum: ExpertType, nullable: true })
  expert_type: ExpertType | null;

  @Column({ name: 'activity_type', type: 'enum', enum: FarmerActivityType, default: FarmerActivityType.CROP })
  activity_type: FarmerActivityType;

  @Column({ name: 'equipment_type', type: 'varchar', nullable: true })
  equipment_type: string | null;

  /** Virtual property for subscription tier (populated during login/getMe) */
  plan?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @BeforeInsert()
  @BeforeUpdate()
  updateLocation() {
    if (this.lat != null && this.lng != null) {
      this.location = { type: 'Point', coordinates: [this.lng, this.lat] } as any;
    }
  }
}
