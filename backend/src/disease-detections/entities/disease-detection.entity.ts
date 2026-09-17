import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';
import { ExpertType } from '../../common/enums/expert-type.enum';

/** Niveau d'urgence calculé par le moteur d'analyse contextuelle ZirIA Sentinel */
export enum DetectionUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  CRITICAL = 'CRITICAL',
}

/**
 * Résultat enrichi d'une détection de maladie via ZirIA Sentinel.
 * Contient : résultat IA, contexte météo, recommandations multilingues, urgence.
 * Alimente la heatmap du Panel Admin et les alertes push.
 */
@Entity('disease_detections')
export class DiseaseDetection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'reporter_id' })
  reporter_id: string;

  @ManyToOne(() => Parcel, { eager: false, nullable: true })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'parcel_id', nullable: true })
  parcel_id: string;

  /** Coordonnées GPS de la détection terrain */
  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ name: 'crop_type' })
  crop_type: string;

  @Column({ name: 'disease_name' })
  disease_name: string;

  /** Score de confiance PyTorch (0.0 à 1.0) */
  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4 })
  confidence_score: number;

  /** Déclenche le workflow de validation par un expert agronome si < 0.75 */
  @Column({ name: 'requires_expert_validation', default: false })
  requires_expert_validation: boolean;

  /** Niveau d'urgence calculé en croisant maladie + météo */
  @Column({
    type: 'enum',
    enum: DetectionUrgency,
    default: DetectionUrgency.MEDIUM,
  })
  urgency: DetectionUrgency;

  /** Recommandation agronomique en Français (générée par Gemini) */
  @Column({ name: 'recommendation_fr', type: 'text', nullable: true })
  recommendation_fr: string;

  /** Recommandation vocale courte en Arabe Tunisien (Darija) */
  @Column({ name: 'recommendation_darija', type: 'text', nullable: true })
  recommendation_darija: string;

  /** Snapshot météo au moment de la détection (JSON) */
  @Column({ name: 'weather_snapshot', type: 'jsonb', nullable: true })
  weather_snapshot: {
    temperature_c: number;
    humidity_pct: number;
    wind_speed_kmh: number;
    precipitation_mm: number;
    weather_code: number;
  };

  /** URL Cloudinary de la photo de la plante */
  @Column({ name: 'photo_url', type: 'varchar', nullable: true })
  photo_url: string | null;

  /** Expert assigné pour la validation (null = premier disponible) */
  @Column({ name: 'assigned_expert_id', type: 'varchar', nullable: true })
  assigned_expert_id: string | null;

  /** Indique si un expert certifié a validé ou corrigé ce diagnostic */
  @Column({ name: 'is_expert_validated', default: false })
  is_expert_validated: boolean;

  @Column({ name: 'required_expert_type', type: 'enum', enum: ExpertType, nullable: true })
  required_expert_type: ExpertType | null;

  /** Commentaire agronomique de l'expert (assessment professionnel) */
  @Column({ name: 'expert_comments', type: 'text', nullable: true })
  expert_comments: string | null;

  /** Sprint 4: plant vs animal detection */
  @Column({ name: 'detection_type', type: 'varchar', length: 20, default: 'PLANT' })
  detection_type: 'PLANT' | 'ANIMAL';

  /** Sprint 4: espèce animale concernée (Bovin, Ovin, etc.) */
  @Column({ name: 'animal_species', type: 'varchar', length: 100, nullable: true })
  animal_species: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
