import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Cooperative } from '../../cooperatives/entities/cooperative.entity';
import { CropZone } from './crop-zone.entity';
import { OneToMany } from 'typeorm';
import { ColumnNumericTransformer } from '../../common/transformers/numeric.transformer';

/**
 * Représente une parcelle agricole géolocalisée.
 * V1.0 : Ajout des champs GDD (Degrés-Jours de Croissance) pour la prédiction
 * de récolte, de la boundary GeoJSON pour l'affichage Leaflet, et du type de sol.
 */
@Entity('parcels')
export class Parcel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  owner_id: string;

  @ManyToOne(() => Cooperative, { eager: false, nullable: true })
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: Cooperative;

  @Column({ name: 'cooperative_id', type: 'uuid', nullable: true })
  cooperative_id: string;

  @OneToMany(() => CropZone, (zone) => zone.parcel, { cascade: true })
  zones: CropZone[];

  /** Nom de la parcelle (e.g. "Champ Nord") */
  @Column({ name: 'name', type: 'varchar', nullable: true })
  name: string | null;

  /** Couleur de la parcelle sur la carte (hex) */
  @Column({ name: 'color_hex', type: 'varchar', length: 7, nullable: true })
  color_hex: string | null;

  /** Type de culture : blé, orge, tomate, olive, piment... */
  @Column({ name: 'crop_type', type: 'varchar', nullable: true })
  crop_type: string | null;

  @Column({ name: 'surface_ha', type: 'decimal', precision: 8, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() })
  surface_ha: number | null;

  /** Surface calculée automatiquement depuis le polygone */
  @Column({ name: 'area_ha', type: 'decimal', precision: 8, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() })
  area_ha: number | null;

  /** Latitude GPS du centroïde (nouveau) */
  @Column({ name: 'center_lat', type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: new ColumnNumericTransformer() })
  center_lat: number | null;

  /** Longitude GPS du centroïde (nouveau) */
  @Column({ name: 'center_lng', type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: new ColumnNumericTransformer() })
  center_lng: number | null;

  /** Latitude GPS (ancien / fallback) */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: new ColumnNumericTransformer() })
  lat: number | null;

  /** Longitude GPS (ancien / fallback) */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: new ColumnNumericTransformer() })
  lng: number | null;

  /**
   * GeoJSON Polygon représentant les délimitations réelles de la parcelle.
   * PostGIS Geography column with GIST Index.
   */
  @Index({ spatial: true })
  @Column({ type: 'geography', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  boundary: any;

  /** Type de sol : argileux, limoneux, sableux, calcaire, etc. */
  @Column({ name: 'soil_type', type: 'varchar', nullable: true })
  soil_type: string | null;

  /**
   * Date de plantation réelle.
   * Requise pour le calcul GDD par GddCronService.
   */
  @Column({ name: 'planted_at', type: 'date', nullable: true })
  planted_at: Date | null;

  /**
   * Degrés-Jours de Croissance accumulés depuis la plantation.
   * Mis à jour chaque nuit par GddCronService (cron 3h00).
   */
  @Column({
    name: 'gdd_accumulated',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  gdd_accumulated: number;

  /**
   * Date de récolte estimée calculée par le moteur GDD.
   * Injectée automatiquement dans les annonces Marketplace liées.
   */
  @Column({ name: 'harvest_prediction_date', type: 'date', nullable: true })
  harvest_prediction_date: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /** Point PostGIS synchronisé */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: string;

  @BeforeInsert()
  @BeforeUpdate()
  updateLocation() {
    if (this.lat != null && this.lng != null) {
      this.location = { 
        type: 'Point', 
        coordinates: [Number(this.lng), Number(this.lat)] 
      } as any;
    }
  }
}
