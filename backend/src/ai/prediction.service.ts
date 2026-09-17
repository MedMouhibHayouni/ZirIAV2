import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Prediction } from './entities/prediction.entity';
import { AiModelFeedback } from './entities/ai-model-feedback.entity';
import { DiseaseDetection } from '../disease-detections/entities/disease-detection.entity';

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    @InjectRepository(Prediction)
    private readonly predictionRepo: Repository<Prediction>,
    @InjectRepository(AiModelFeedback)
    private readonly feedbackRepo: Repository<AiModelFeedback>,
    private readonly dataSource: DataSource,
  ) {}

  async processFeedback(detectionId: string, expertId: string, isCorrect: boolean, correctedDisease?: string, comments?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update disease_detections
      const detection = await queryRunner.manager.findOne(DiseaseDetection, { where: { id: detectionId }, lock: { mode: 'pessimistic_write' } });
      if (detection) {
         detection.requires_expert_validation = false;
         if (!isCorrect && correctedDisease) {
             detection.disease_name = correctedDisease;
         }
         await queryRunner.manager.save(detection);
      }

      // 2. Insert into ai_model_feedbacks
      const feedback = queryRunner.manager.create(AiModelFeedback, {
         prediction_id: detectionId,
         expert_id: expertId,
         is_correct: isCorrect,
         corrected_value_jsonb: correctedDisease ? { disease: correctedDisease } : undefined,
         comments: comments || undefined
      });
      await queryRunner.manager.save(feedback);

      await queryRunner.commitTransaction();
      return feedback;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error processing AI feedback: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async calculateMAE() {
    // Méthode d'évaluation périodique
    const predictions = await this.predictionRepo.find({
      where: { domain: 'MARKET_PRICE' }
    });

    let sumError = 0;
    let count = 0;

    for (const pred of predictions) {
      if (pred.prediction_value_jsonb?.price && pred.actual_value_jsonb?.price) {
        const diff = Math.abs(pred.prediction_value_jsonb.price - pred.actual_value_jsonb.price);
        sumError += diff;
        count++;
      }
    }

    const mae = count > 0 ? (sumError / count) : 0;
    this.logger.log(`Current MAE for MARKET_PRICE is ${mae}`);
    return mae;
  }
}
