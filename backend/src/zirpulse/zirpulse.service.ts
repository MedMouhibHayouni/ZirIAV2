import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZirpulsePost, ZirpulseStatus } from './entities/zirpulse-post.entity';
import { AiService } from '../ai/ai.service';
import { ListingStatus } from '../marketplace/entities/marketplace-listing.entity';

@Injectable()
export class ZirpulseService {
  private readonly logger = new Logger(ZirpulseService.name);

  constructor(
    @InjectRepository(ZirpulsePost)
    private readonly zirpulseRepo: Repository<ZirpulsePost>,
    private readonly aiService: AiService,
  ) {}

  async processAudioPost(reporterId: string, audioUrl: string, lat?: number, lng?: number): Promise<ZirpulsePost> {
    // 1. Create the ZirpulsePost record
    const post = this.zirpulseRepo.create({
      reporter_id: reporterId,
      audio_url: audioUrl,
      lat: lat || null,
      lng: lng || null,
      status: ZirpulseStatus.PROCESSING,
    });
    
    let savedPost = await this.zirpulseRepo.save(post);

    try {
      // 2. Send to AiService -> AudioProcessingService (Gemini)
      // This function already parses intent and automatically creates a MarketplaceListing in DRAFT/PENDING_VALIDATION state.
      const result = await this.aiService.parseAudioIntent(
        audioUrl,
        lat || 0,
        lng || 0,
        reporterId
      );

      // 3. Update the ZirpulsePost with Gemini's results
      savedPost.transcript = result.transcript_darija;
      savedPost.intent_json = {
        intent: result.intent,
        crop: result.crop_type,
        qty: result.quantity_tonnes,
        price_per_kg: result.price_per_kg,
        listing_id: result.listing_id,
      };
      
      if (result.crop_type) {
        savedPost.tags.push(result.crop_type.toLowerCase());
      }
      if (result.intent) {
        savedPost.tags.push(result.intent.toLowerCase());
      }

      if (result.intent === 'VENDRE' && result.crop_type && result.quantity_tonnes) {
        savedPost.pre_filled_listing_dto = {
          crop_type: result.crop_type.toLowerCase(),
          quantity_tonnes: result.quantity_tonnes,
          price_per_kg: result.price_per_kg || 0,
          status: ListingStatus.PENDING_VALIDATION, // or DRAFT
        };
      }

      savedPost.status = ZirpulseStatus.DONE;
      savedPost = await this.zirpulseRepo.save(savedPost);
      
      this.logger.log(`ZirPulse completed for post ${savedPost.id}`);
      return savedPost;

    } catch (error) {
      this.logger.error(`Failed to process ZirPulse post ${savedPost.id}: ${error.message}`);
      savedPost.status = ZirpulseStatus.FAILED;
      savedPost.error_message = error.message;
      await this.zirpulseRepo.save(savedPost);
      throw new InternalServerErrorException('Erreur lors de l\'analyse de l\'audio');
    }
  }

  async findMyPosts(reporterId: string): Promise<ZirpulsePost[]> {
    return this.zirpulseRepo.find({
      where: { reporter_id: reporterId },
      order: { created_at: 'DESC' },
    });
  }

  async findAll(): Promise<ZirpulsePost[]> {
    return this.zirpulseRepo.find({
      where: { status: ZirpulseStatus.DONE },
      relations: ['reporter'],
      order: { created_at: 'DESC' },
    });
  }

  async likePost(postId: string): Promise<ZirpulsePost> {
    const post = await this.zirpulseRepo.findOne({ where: { id: postId } });
    if (!post) throw new InternalServerErrorException('Post non trouvé');
    post.likes += 1;
    return this.zirpulseRepo.save(post);
  }
}
