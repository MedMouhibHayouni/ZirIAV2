import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MlopsClientService } from './mlops-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,     // 10 s — inference can take a moment on cold start
      maxRedirects: 3,
    }),
  ],
  providers: [MlopsClientService],
  exports: [MlopsClientService],   // importable by AiModule, PredictiveModule, etc.
})
export class MlopsModule {}
