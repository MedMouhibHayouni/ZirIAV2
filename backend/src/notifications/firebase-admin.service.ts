import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private isInitialized = false;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  onModuleInit() {
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      let credential;

      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        credential = admin.credential.cert(serviceAccount);
      } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        credential = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
      }

      if (!credential) {
        this.logger.warn('Firebase configuration missing (FIREBASE_SERVICE_ACCOUNT_JSON or individual vars). Push notifications are disabled.');
        return;
      }
      
      admin.initializeApp({
        credential,
      });

      this.isInitialized = true;
      this.logger.log('Firebase Admin initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin. Push notifications are disabled.', (error as Error).stack);
    }
  }

  async sendPush(fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn(`Firebase not initialized. Skipped push to ${fcmToken}`);
      return;
    }

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: data || {},
      });
      this.logger.log(`Push notification sent to token: ${fcmToken.substring(0, 10)}...`);
    } catch (error: any) {
      this.logger.error(`Failed to send push notification to ${fcmToken}: ${error.message}`);
      
      if (error.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(`Token not registered, nullifying for token: ${fcmToken}`);
        await this.userRepo.update({ fcm_token: fcmToken } as any, { fcm_token: null } as any);
      }
    }
  }
}
