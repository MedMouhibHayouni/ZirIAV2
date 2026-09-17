import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import { AgentService } from '../ai/agent.service';
import * as os from 'os';

async function bootstrap() {
  const logger = new Logger('ConnectivityTest');
  logger.log('--- ZirIA Sentinel Mobile Connectivity & Infrastructure Audit ---');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const configService = app.get(ConfigService);
  const uploadService = app.get(UploadService);
  const agentService = app.get(AgentService);

  const results = {
    database: false,
    cloudinary: false,
    gemini: false,
    environment: false,
    system: false,
  };

  // 1. Database Check
  try {
    const dbTime = await dataSource.query('SELECT NOW()');
    logger.log(`✅ Database Connected. Server Time: ${dbTime[0].now}`);
    results.database = true;
  } catch (e) {
    logger.error('❌ Database Connection Failed!', e.message);
  }

  // 2. Cloudinary Check
  try {
    const cloudName = configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get('CLOUDINARY_API_KEY');
    if (cloudName && apiKey) {
      logger.log(`✅ Cloudinary Configured (Cloud: ${cloudName})`);
      results.cloudinary = true;
    } else {
      logger.warn('⚠️ Cloudinary Credentials Missing in .env');
    }
  } catch (e) {
    logger.error('❌ Cloudinary Check Failed', e.message);
  }

  // 3. Gemini AI Check
  try {
    const geminiKey = configService.get('GEMINI_API_KEY');
    if (geminiKey) {
      // Small test if possible without calling the API too much
      logger.log('✅ Gemini API Key Present');
      results.gemini = true;
    } else {
      logger.warn('⚠️ Gemini API Key Missing');
    }
  } catch (e) {
    logger.error('❌ Gemini Check Failed', e.message);
  }

  // 4. Critical Env Variables
  const criticalKeys = ['JWT_SECRET', 'DB_HOST', 'DB_PORT', 'REDIS_URL'];
  const missingKeys = criticalKeys.filter(key => !configService.get(key));
  if (missingKeys.length === 0) {
    logger.log('✅ All Critical Environment Variables Present');
    results.environment = true;
  } else {
    logger.warn(`⚠️ Missing Environment Variables: ${missingKeys.join(', ')}`);
  }

  // 5. System Resources
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  logger.log(`ℹ️ System Memory: ${freeMem}MB Free / ${totalMem}MB Total`);
  if (freeMem > 100) {
    results.system = true;
  }

  logger.log('---------------------------------------------------------');
  const allOk = Object.values(results).every(v => v === true);
  if (allOk) {
    logger.log('🚀 SYSTEM READY FOR MOBILE CONNECTIVITY TESTING');
  } else {
    logger.warn('🚧 SYSTEM HAS GAPS - CHECK LOGS ABOVE');
  }
  logger.log('---------------------------------------------------------');

  await app.close();
}

bootstrap();
