import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private apiKeys: string[] = [];
  private currentKeyIndex = 0;
  /** Indices of keys that have hit their DAILY quota (limit: 0). Reset at midnight. */
  private readonly dailyExhaustedKeys = new Set<number>();

  constructor(private readonly configService: ConfigService) {
    this.apiKeys = [
      this.configService.get<string>('GOOGLE_GEMINI_API_KEY'),
      this.configService.get<string>('GOOGLE_GEMINI_API_KEYMMH'),
      this.configService.get<string>('GOOGLE_GEMINI_API_KEYMMHAYOUNI'),
      this.configService.get<string>('GOOGLE_GEMINI_API_KEYAiKup')
    ].filter(k => !!k && k !== 'MISSING_KEY') as string[];

    if (this.apiKeys.length === 0) {
      this.logger.error('Aucune clé Google Gemini API trouvée dans le configuration/env');
    } else {
      this.logger.log(`Gemini Service initialized with ${this.apiKeys.length} keys in rotation pool.`);
      // Auto-reset daily exhausted keys at midnight UTC
      this.scheduleDailyReset();
    }
  }

  /** Returns true when ALL keys have hit their daily free-tier quota. */
  isFullyExhausted(): boolean {
    return this.apiKeys.length > 0 && this.dailyExhaustedKeys.size >= this.apiKeys.length;
  }

  private scheduleDailyReset() {
    const now = new Date();
    const msUntilMidnightUTC =
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).getTime() - Date.now();
    setTimeout(() => {
      this.dailyExhaustedKeys.clear();
      this.logger.log('[GeminiService] Daily quota reset — tous les clés sont disponibles.');
      this.scheduleDailyReset();
    }, msUntilMidnightUTC);
  }

  private isDailyQuotaError(error: any): boolean {
    const msg: string = error?.message || '';
    return (
      error?.status === 429 &&
      (msg.includes('limit: 0') || msg.includes('PerDay') || msg.includes('PerModelPerDay'))
    );
  }

  getGenAI(): GoogleGenerativeAI | null {
    if (this.apiKeys.length === 0) return null;
    const key = this.apiKeys[this.currentKeyIndex % this.apiKeys.length];
    return new GoogleGenerativeAI(key);
  }

  async generateContent(
    modelName: string,
    promptOrParts: string | any[],
    options: { temperature?: number; responseMimeType?: string; systemInstruction?: string } = {}
  ): Promise<any> {
    if (this.apiKeys.length === 0) {
      throw new Error('Gemini API key is not configured.');
    }

    let lastError: any = null;
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      const idx = (this.currentKeyIndex + attempts) % this.apiKeys.length;
      const key = this.apiKeys[idx];
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemInstruction,
        generationConfig: {
          temperature: options.temperature,
          responseMimeType: options.responseMimeType,
        },
      });

      let retries = 1;
      while (retries >= 0) {
        try {
          const result = await model.generateContent(promptOrParts);
          // Success! Save the current key index.
          this.currentKeyIndex = idx;
          return result;
        } catch (error: any) {
          lastError = error;
          this.logger.warn(`Gemini call failed with key index ${idx}. Error status: ${error.status || error.message}`);
          
          if (error.status === 429) {
            if (this.isDailyQuotaError(error)) {
              this.dailyExhaustedKeys.add(idx);
              this.logger.warn(`Quota DAILY épuisé pour la clé ${idx} (${this.dailyExhaustedKeys.size}/${this.apiKeys.length} clés épuisées).`);
            } else {
              this.logger.warn(`Quota 429 hit for key index ${idx}. Rotating key...`);
            }
            break;
          } else if (error.status === 503 && retries > 0) {
            this.logger.warn(`Gemini 503 error, retrying same key...`);
            await new Promise(res => setTimeout(res, 2000));
            retries--;
          } else {
            // Non-429 and non-503 error, or out of retries. Try next key.
            retries = -1;
            break;
          }
        }
      }
      attempts++;
    }

    throw lastError || new Error('All Gemini API keys exhausted without success.');
  }
}
