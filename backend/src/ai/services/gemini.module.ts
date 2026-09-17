import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';

/**
 * GeminiModule — Shared module providing GeminiService (multi-key rotation).
 * Import this in any module that needs Gemini AI calls.
 */
@Module({
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
