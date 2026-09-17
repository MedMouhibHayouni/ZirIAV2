import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { memoryStorage } from 'multer';

import { Throttle } from '@nestjs/throttler';

@ApiTags('Upload Médias')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /upload/image
   * Upload une image vers Cloudinary depuis un formulaire multipart.
   */
  @Post('image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload une image vers Cloudinary (max 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Fichier image (JPEG/PNG/WebP)' },
      },
    },
  })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    const url = await this.uploadService.uploadImage(file, 'ziria/uploads');
    return { url, message: 'Image uploadée avec succès' };
  }

  /**
   * POST /upload/disease-photo
   * Upload spécifique pour les photos de maladies agricoles (dossier dédié).
   */
  @Post('disease-photo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload photo de maladie vers Cloudinary (dossier ziria/diseases)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async uploadDiseasePhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    const url = await this.uploadService.uploadImage(file, 'ziria/diseases');
    return { url, message: 'Photo de maladie uploadée avec succès' };
  }

  /**
   * POST /upload/public/plant
   * Public upload endpoint for 'Know My Plant' feature.
   */
  @Post('public/plant')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload public de photo de plante pour identification (sans authentification)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Fichier image (JPEG/PNG/WebP)' },
      },
    },
  })
  async uploadPublicPlantImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    const url = await this.uploadService.uploadImage(file, 'ziria/public_plants');
    return { url, message: 'Image publique uploadée avec succès' };
  }

  /**
   * POST /upload/audio
   */
  @Post('audio')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max pour l'audio
      fileFilter: (req, file, cb) => {
        const allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/webm'];
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Type de fichier audio non supporté.'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload un fichier audio vers Cloudinary (max 15 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Fichier audio (MP3/WAV/AAC/WEBM)' },
      },
    },
  })
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    const url = await this.uploadService.uploadAudio(file, 'ziria/audio');
    return { url, message: 'Audio uploadé avec succès' };
  }
}
