import { Controller, Post, Get, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { AiService } from './ai.service';
import { PredictionService } from './prediction.service';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class KnowMyPlantDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/.../plant.jpg', description: 'URL of the plant photo to identify' })
  @IsString()
  photo_url: string;
}

class AnalyzeImageDto {
  @ApiPropertyOptional({ example: 'piment doux', description: 'Type de culture pour affiner le raisonnement Gemini' })
  @IsString()
  @IsOptional()
  crop_type?: string;

  @ApiPropertyOptional({ example: 'uuid-parcel', description: 'ID de la parcelle liée (optionnel)' })
  @IsString()
  @IsOptional()
  parcel_id?: string;

  @ApiProperty({ example: 35.1711, description: 'Latitude GPS du terrain' })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ example: 8.8306, description: 'Longitude GPS du terrain' })
  @IsNumber()
  @Type(() => Number)
  lng: number;
}

class PredictYieldDto {
  @ApiProperty({ example: 'tomate', description: 'Type de culture' })
  @IsString()
  crop_type: string;

  @ApiProperty({ example: 2.5, description: 'Surface en hectares' })
  @IsNumber()
  @Type(() => Number)
  surface_ha: number;
}

class AudioIntentDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/.../memo.m4a', description: 'URL Cloudinary de l\'audio' })
  @IsString()
  audio_url: string;

  @ApiProperty({ example: 35.17, description: 'Lat' })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ example: 8.83, description: 'Lng' })
  @IsNumber()
  @Type(() => Number)
  lng: number;
}

import { Throttle } from '@nestjs/throttler';

@ApiTags('ZirIA Sentinel — Intelligence Multimodale')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly predictionService: PredictionService,
    private readonly uploadService: UploadService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * POST /ai/analyze-disease
   * Pipeline complet ZirIA Sentinel :
   * Vision (PyTorch) → Météo → Gemini → DB → Logistique
   */
  @Post('analyze-disease')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR, Role.COOP_PRESIDENT, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.'), false);
      }
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '[Sentinel] Analyser une image de plante — Pipeline complet',
    description: `Upload l'image via Cloudinary puis lance le Pipeline multimodal ZirIA Sentinel :
    1. Classe la maladie via le microservice PyTorch (fallback mock si offline)
    2. Récupère les conditions météo GPS via Open-Meteo
    3. Gemini 1.5 Flash croise vision + météo → urgence (LOW/MEDIUM/CRITICAL) + recommandations FR & Darija
    4. Sauvegarde le rapport complet (maladie, météo, reco) dans disease_detections
    5. Si vent > 40km/h ou pluie > 70% : notifie les propriétaires d'équipements dans la zone
    6. Si confidence < 0.75 : flag requires_expert_validation = true pour le Dashboard Agronome`,
  })
  async analyzeDisease(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeImageDto,
    @CurrentUser() user: any
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier image fourni');
    }

    const imageUrl = await this.uploadService.uploadImage(file, 'ziria/diseases');

    return this.aiService.analyzePlantDisease(
      imageUrl,
      dto.lat,
      dto.lng,
      user.id,
      dto.crop_type,
      dto.parcel_id,
    );
  }

  /**
   * GET /ai/harvest-prediction/:parcelId
   * Calcule la date de récolte optimale avec ajustement météo.
   */
  @Get('harvest-prediction/:parcelId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR, Role.COOP_PRESIDENT, Role.ADMIN, Role.B2B_BUYER)
  @ApiOperation({
    summary: '[Predictive] Date de récolte estimée (crop constants + météo)',
    description:
      'Calcule la date de récolte d\'une parcelle en croisant les constantes CRDA (plage de croissance par culture) ' +
      'avec la météo actuelle. Requiert planted_at renseigné sur la parcelle.',
  })
  getHarvestDate(@Param('parcelId') parcelId: string) {
    return this.aiService.calculateHarvestDate(parcelId);
  }

  /**
   * POST /ai/predict-yield
   * Prédiction de rendement tabulaire (rapide, sans Python).
   */
  @Post('predict-yield')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR, Role.COOP_PRESIDENT, Role.ADMIN, Role.B2B_BUYER)
  @ApiOperation({
    summary: '[Predictive] Rendement estimé par culture et surface',
    description: 'Retourne le rendement prédit en tonnes avec un intervalle de confiance [±20%].',
  })
  @ApiBody({ type: PredictYieldDto })
  predictYield(@Body() dto: PredictYieldDto) {
    return this.aiService.predictYield(dto.crop_type, dto.surface_ha);
  }

  /**
   * POST /ai/audio-intent
   * ZirPulse : Analyse un mémo vocal en Darija.
   */
  @Post('audio-intent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR, Role.COOP_PRESIDENT)
  @UseInterceptors(IdempotencyInterceptor)
  @Idempotent()
  @ApiOperation({
    summary: '[ZirPulse] Extraire l\'intention depuis un mémo vocal Darija',
    description: 'Transcrit l\'audio et crée une annonce Marketplace en PENDING_VALIDATION si intent = VENDRE.',
  })
  @ApiBody({ type: AudioIntentDto })
  parseAudio(@Body() dto: AudioIntentDto, @CurrentUser() user: any) {
    return this.aiService.parseAudioIntent(dto.audio_url, dto.lat, dto.lng, user.id);
  }

  /**
   * POST /ai/feedback
   * CRDA Expert feedback loop for MLOps
   */
  @Post('feedback')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EXPERT)
  @ApiOperation({ summary: 'Soumettre une correction CRDA sur un diagnostic' })
  submitFeedback(@Body() dto: any, @CurrentUser() user: any) {
    return this.predictionService.processFeedback(
      dto.detection_id,
      user.id,
      dto.is_correct,
      dto.corrected_disease,
      dto.comments
    );
  }

  /**
   * POST /ai/know-my-plant
   * Public/hybrid plant identification endpoint.
   */
  @Post('know-my-plant')
  @ApiOperation({
    summary: 'Identifier une plante à partir d\'une image (Public / Hybrid)',
    description: 'Permet aux invités d\'identifier 1 plante par jour gratuitement par adresse IP. Pas de limite pour les utilisateurs connectés.',
  })
  @ApiBody({ type: KnowMyPlantDto })
  async knowMyPlant(
    @Body() dto: KnowMyPlantDto,
    @Req() req: any,
  ) {
    let userId: string | undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = this.jwtService.verify(token);
        if (payload && payload.id) {
          userId = payload.id;
        }
      } catch (err) {
        // Treat as guest if token is invalid
      }
    }

    const ipAddress = req.ip || req.connection?.remoteAddress || '';
    return this.aiService.identifyPlant(dto.photo_url, userId, ipAddress);
  }

  /**
   * GET /ai/know-my-plant/history
   * Retrieve logged-in user's identification history.
   */
  @Get('know-my-plant/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtenir l\'historique des plantes identifiées de l\'utilisateur connecté' })
  async knowMyPlantHistory(@CurrentUser() user: any) {
    return this.aiService.getUserPlantIdentifications(user.id);
  }

  /**
   * POST /ai/diagnose
   * Endpoint de diagnostic direct V4 (modèle local calibré 38 classes -> Gemini fallback -> expert)
   */
  @Post('diagnose')
  @ApiOperation({ summary: 'Diagnostic direct V4 (VisionService 38 classes)' })
  async diagnose(@Body() body: { image_url: string; crop_type?: string; request_id?: string }) {
    if (!body?.image_url) {
      throw new BadRequestException('image_url is required');
    }
    return this.aiService.diagnoseDirect(body.image_url, body.crop_type, body.request_id);
  }
}

