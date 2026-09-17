import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

/**
 * Upload Service - Cloudinary Free Tier
 *
 * Gère l'upload des médias (photos de maladies, avatars) vers Cloudinary.
 * Retourne l'URL publique HTTPS du fichier uploadé.
 *
 * Configuration requise dans .env :
 *   CLOUDINARY_CLOUD_NAME=...
 *   CLOUDINARY_API_KEY=...
 *   CLOUDINARY_API_SECRET=...
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');

    this.isConfigured = !!(cloudName && apiKey && apiSecret);

    if (this.isConfigured) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.logger.log('Cloudinary configuré et opérationnel');
    } else {
      this.logger.warn(
        'Cloudinary non configuré (variables manquantes). Les uploads retourneront une URL mockée.',
      );
    }
  }

  /**
   * Upload un fichier Multer vers Cloudinary.
   * @param file - Fichier reçu via @UploadedFile() dans le contrôleur
   * @param folder - Dossier Cloudinary cible (ex: 'ziria/diseases', 'ziria/avatars')
   * @returns URL publique HTTPS du fichier
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'ziria/uploads',
  ): Promise<string> {
    if (!this.isConfigured) {
      // Mode dégradé : retourne une URL Cloudinary de démonstration
      this.logger.warn('Upload simulé : Cloudinary non configuré');
      return `https://res.cloudinary.com/demo/image/upload/v1/ziria/placeholder_${Date.now()}.jpg`;
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Erreur upload Cloudinary', error);
            reject(new Error(`Upload Cloudinary échoué : ${error.message}`));
          } else {
            this.logger.log(`Image uploadée : ${result.secure_url}`);
            resolve(result.secure_url);
          }
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadAudio(
    file: Express.Multer.File,
    folder: string = 'ziria/audio',
  ): Promise<string> {
    if (!this.isConfigured) {
      this.logger.warn('Upload simulé : Cloudinary non configuré');
      return `https://res.cloudinary.com/demo/video/upload/v1/ziria/placeholder_audio_${Date.now()}.mp3`;
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'video', // 'video' handles audio in Cloudinary
          format: 'webm' // Force format to prevent inference errors on raw blobs
        },
        (error, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Erreur upload Cloudinary audio', error);
            reject(new Error(`Upload Cloudinary audio échoué : ${error.message}`));
          } else {
            this.logger.log(`Audio uploadé : ${result.secure_url}`);
            resolve(result.secure_url);
          }
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadVideo(
    file: Express.Multer.File,
    folder: string = 'ziria/videos',
  ): Promise<string> {
    if (!this.isConfigured) {
      this.logger.warn('Upload simulé : Cloudinary non configuré');
      return `https://res.cloudinary.com/demo/video/upload/v1/ziria/placeholder_video_${Date.now()}.mp4`;
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'video',
          transformation: [
            { quality: 'auto' },
          ],
        },
        (error, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Erreur upload Cloudinary vidéo', error);
            reject(new Error(`Upload Cloudinary vidéo échoué : ${error.message}`));
          } else {
            this.logger.log(`Vidéo uploadée : ${result.secure_url}`);
            resolve(result.secure_url);
          }
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload depuis une URL distante (utile pour les tests et l'IA).
   */
  async uploadFromUrl(imageUrl: string, folder: string = 'ziria/uploads'): Promise<string> {
    if (!this.isConfigured) {
      return imageUrl; // retourne l'URL originale si Cloudinary n'est pas configuré
    }

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder,
      resource_type: 'image',
    });
    return result.secure_url;
  }

  /**
   * Supprime une image Cloudinary par son public_id.
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!this.isConfigured) return;
    await cloudinary.uploader.destroy(publicId);
  }
}
