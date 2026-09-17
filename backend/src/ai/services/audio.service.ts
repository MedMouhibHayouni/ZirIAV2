import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from './gemini.service';
import { firstValueFrom } from 'rxjs';
import { MarketplaceListing, ListingStatus } from '../../marketplace/entities/marketplace-listing.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';

export interface AudioIntentResult {
  transcript_darija: string;
  intent: 'VENDRE' | 'ACHETER' | 'INCONNU';
  crop_type?: string;
  quantity_tonnes?: number;
  price_per_kg?: number;
  listing_id?: string;
}

/**
 * ZirPulse Audio Parser
 * 
 * Processus :
 * 1. Télécharge l'audio Darija depuis l'URL Cloudinary.
 * 2. Encode en base64 pour soumission multimodale.
 * 3. Demande à Gemini 1.5 Flash de transcrire et extraire l'intention agri.
 * 4. Si intention "VENDRE", insère dans MarketplaceListing en mode PENDING_VALIDATION.
 */
@Injectable()
export class AudioProcessingService {
  private readonly logger = new Logger(AudioProcessingService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>, // Pour associer géographiquement si besoin
  ) {}

  async parseAudioIntent(
    audioUrl: string,
    lat: number,
    lng: number,
    reporterId: string
  ): Promise<AudioIntentResult> {
    try {
      this.logger.log(`ZirPulse Audio📥: Téléchargement ${audioUrl}`);
      
      // 1. Download as ArrayBuffer
      const response = await firstValueFrom(
        this.httpService.get(audioUrl, { responseType: 'arraybuffer' })
      );
      const audioBuffer = Buffer.from(response.data, 'binary');
      const base64Audio = audioBuffer.toString('base64');
      
      // Essayer de déterminer le mime par l'URL, par défaut webm ou mp3
      const mimeType = audioUrl.toLowerCase().endsWith('.wav') ? 'audio/wav' 
        : audioUrl.toLowerCase().endsWith('.mp3') ? 'audio/mp3' 
        : 'audio/mp3'; // Default fallback that Gemini understands

      // 2. Multimodal Prompt to Gemini with key rotation
      const prompt = `
        Tu es l'assistant vocal ZirPulse pour Kasserine.
        Écoute ce fichier audio en dialecte Tunisien (Darija).
        
        Tâche 1 : Transcris phonétiquement ce qui a été dit.
        Tâche 2 : Identifie s'il s'agit d'une annonce de vente de récolte ou d'un achat.
        
        Analyse l'intention et extraies les entités suivantes si c'est pour "VENDRE" :
        - crop_type : le nom de la culture (ex: tomate, olive, blé).
        - quantity_tonnes : la quantité en tonnes (convertis si dit en kg).
        - price_per_kg : le prix demandé par kilo en TND (Dinars Tunisiens).

        S'il s'agit d'une autre intention, l'intent = "INCONNU".

        Doit retourner strictement cet objet JSON (et rien d'autre) :
        {
          "transcript_darija": "...",
          "intent": "VENDRE",
          "crop_type": "...",
          "quantity_tonnes": 5.0,
          "price_per_kg": 1.2
        }
      `;

      const result = await this.geminiService.generateContent(
        'gemini-2.0-flash',
        [prompt, { inlineData: { data: base64Audio, mimeType } }],
        { temperature: 0.1, responseMimeType: 'application/json' }
      );

      const text = result.response.text();
      const parsed = JSON.parse(text) as AudioIntentResult;
      
      this.logger.log(`ZirPulse Extracted: ${parsed.intent} | Culture: ${parsed.crop_type}`);

      // 3. Integration Marketplace automatique si VENDRE
      if (parsed.intent === 'VENDRE' && parsed.crop_type && parsed.quantity_tonnes) {
        // Find closest parcel for seller to attach to listing
        const closestParcel = await this.parcelRepo.createQueryBuilder('parcel')
            .where('parcel.owner_id = :reporterId', { reporterId })
            .andWhere('ST_DWithin(ST_MakePoint(parcel.lng, parcel.lat)::geography, ST_MakePoint(:lng, :lat)::geography, 5000)',
                { lng, lat }
            )
            .getOne();

        const listing = this.listingRepo.create({
            seller_id: reporterId,
            parcel_id: closestParcel?.id || undefined,
            crop_type: parsed.crop_type.toLowerCase(),
            quantity_tonnes: parsed.quantity_tonnes,
            price_per_kg: parsed.price_per_kg || 0, // 0 si non mentionné = PENDING negotiation
            status: ListingStatus.PENDING_VALIDATION, // Validation demandée sur frontend
        });

        const saved = await this.listingRepo.save(listing);
        parsed.listing_id = saved.id;
        this.logger.log(`Annonce générée automatiquement: ${saved.id} (PENDING_VALIDATION)`);
      }

      return parsed;

    } catch (error) {
      this.logger.error(`ZirPulse Audio Error: ${error.message}`);
      throw error;
    }
  }
}
