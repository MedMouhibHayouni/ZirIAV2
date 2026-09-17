import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface YieldPredictionInput {
  crop_type: string;
  parcel_area_ha: number;
  governorate: string;
  gdd_accumulated: number;
  rainfall_mm: number;
  fertilizer_kg_ha?: number;
  disease_pressure_score?: number;
}

export interface YieldPredictionResult {
  crop_type: string;
  predicted_yield_tonnes_ha: number;
  total_predicted_tonnes: number;
  confidence: number;
  model_version: string;
  simulated: boolean;
}

export interface PricePredictionInput {
  crop_type: string;
  periods?: number;
}

export interface PriceForecast {
  date: string;
  predicted_price_tnd_tonne: number;
  lower_bound: number;
  upper_bound: number;
}

export interface PricePredictionResult {
  crop_type: string;
  forecast: PriceForecast[];
  model_version: string;
  simulated: boolean;
}

/**
 * MlopsClientService
 * NestJS client that calls the FastAPI MLOps inference microservice.
 * Configured via MLOPS_BASE_URL environment variable.
 * Implements OnModuleInit to log health status on boot.
 */
@Injectable()
export class MlopsClientService implements OnModuleInit {
  private readonly logger = new Logger(MlopsClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('MLOPS_BASE_URL') || 
                   this.config.get<string>('AI_SERVICE_URL') || 
                   'http://localhost:8000';
  }

  /** Ping the MLOps service on NestJS startup */
  async onModuleInit() {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/health`, { timeout: 5000 } as any),
      );
      this.logger.log(
        `✅ MLOps engine reachable — yield model: ${data.yield_model_loaded}, ` +
        `price model: ${data.price_model_loaded} [v${data.version}]`,
      );
    } catch {
      this.logger.warn(
        `⚠️  MLOps engine not reachable at ${this.baseUrl}. ` +
        `Predictive endpoints will be unavailable until the service starts.`,
      );
    }
  }

  /**
   * Predict crop yield for a given parcel.
   */
  async predictYield(input: YieldPredictionInput): Promise<YieldPredictionResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<YieldPredictionResult>(`${this.baseUrl}/predict/yield`, input),
      );
      return data;
    } catch (err) {
      this.logger.error('predictYield failed', (err as AxiosError).message);
      throw err;
    }
  }

  /**
   * Forecast crop market price for the next N days.
   */
  async predictPrice(input: PricePredictionInput): Promise<PricePredictionResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<PricePredictionResult>(`${this.baseUrl}/predict/price`, input),
      );
      return data;
    } catch (err) {
      this.logger.error('predictPrice failed', (err as AxiosError).message);
      throw err;
    }
  }
}
