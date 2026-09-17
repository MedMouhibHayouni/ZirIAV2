export interface MarketplaceListing {
  id: string;
  seller_id: string;
  seller_name?: string; // Nom de la SMSA ou de l'agriculteur
  parcel_id?: string;
  crop_type: string;
  quantity_tonnes: number;
  price_per_kg: number;
  status: 'ACTIVE' | 'PENDING_VALIDATION' | 'SOLD' | 'ARCHIVED';
  created_at: Date;
  lat?: number;
  lng?: number;
  governorate?: string;
  harvest_date?: string;
  harvest_prediction_date?: string;
  quality?: 'premium' | 'standard' | 'bio';
}
