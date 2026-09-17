import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * DiseaseKnowledgeEntry — Base de connaissances locale de ZirIA.
 *
 * Chaque entrée représente une maladie confirmée pour une culture donnée,
 * enrichie par les réponses Gemini (confiance >= 85%) et les corrections
 * d'experts agronomes. Sert de cache Tier-1 pour éviter les appels Gemini
 * redondants lors d'épidémies répétées.
 *
 * Pipeline :
 *   1. Lookup local (0 token) → confiance élevée + hit_count >= 2 → retour immédiat
 *   2. Appel Gemini → confiance >= 0.85 → entraînement auto de cette table
 *   3. Validation expert → force is_verified = true → priorité maximale
 */
@Entity('disease_knowledge')
@Index('idx_dk_crop_confidence', ['crop_type', 'avg_confidence'])
@Index('idx_dk_disease', ['disease_name'])
export class DiseaseKnowledgeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Culture concernée — normalisée en minuscules (tomate, blé, olive...) */
  @Column({ name: 'crop_type', length: 120 })
  crop_type: string;

  /** Nom complet de la maladie (fr + latin) */
  @Column({ name: 'disease_name', length: 255 })
  disease_name: string;

  /** Mots-clés de symptômes visuels extraits par Gemini */
  @Column({ name: 'visual_symptoms', type: 'jsonb', default: '[]' })
  visual_symptoms: string[];

  /** Description clinique courte */
  @Column({ name: 'disease_description', type: 'text', nullable: true })
  disease_description: string | null;

  /** Recommandation agronomique en Français (générée par Gemini, mise en cache) */
  @Column({ name: 'recommendation_fr', type: 'text', nullable: true })
  recommendation_fr: string | null;

  /** Recommandation en Darija tunisien (mise en cache) */
  @Column({ name: 'recommendation_darija', type: 'text', nullable: true })
  recommendation_darija: string | null;

  /** Nombre de fois que cette entrée a été confirmée/détectée */
  @Column({ name: 'hit_count', type: 'int', default: 1 })
  hit_count: number;

  /** Moyenne glissante de confiance Gemini sur les observations */
  @Column({ name: 'avg_confidence', type: 'decimal', precision: 5, scale: 4, default: 0 })
  avg_confidence: number;

  /**
   * Validée manuellement par un expert agronome.
   * Les entrées vérifiées ont priorité absolue sur le score de confiance.
   */
  @Column({ name: 'is_verified', default: false })
  is_verified: boolean;

  /** Source de l'entraînement : Gemini ou correction expert */
  @Column({
    name: 'source',
    type: 'enum',
    enum: ['gemini', 'expert_correction'],
    default: 'gemini',
  })
  source: 'gemini' | 'expert_correction';

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'last_seen_at' })
  last_seen_at: Date;
}
