import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiseaseDetectionsController } from './disease-detections.controller';
import { DiseaseDetectionsService } from './disease-detections.service';
import { DiseaseDetection } from './entities/disease-detection.entity';
import { NotificationModule } from '../notifications/notification.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DiseaseDetection]),
    NotificationModule,
    forwardRef(() => AiModule),
  ],
  controllers: [DiseaseDetectionsController],
  providers: [DiseaseDetectionsService],
  exports: [DiseaseDetectionsService],
})
export class DiseaseDetectionsModule {}
