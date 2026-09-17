export interface DiseaseDetection {
  id: string;
  reporter_id: string;
  photo_url: string;
  crop_type?: string;
  lat: number;
  lng: number;
  disease_name: string;
  confidence_score: number;
  urgency: 'LOW' | 'MEDIUM' | 'CRITICAL';
  recommendation_fr: string;
  recommendation_darija: string;
  requires_expert_validation: boolean;
  weather_snapshot: any;
  created_at: Date;
}
