import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZirpulseController } from './zirpulse.controller';
import { ZirpulseService } from './zirpulse.service';
import { ZirpulsePost } from './entities/zirpulse-post.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZirpulsePost]),
    AiModule,
  ],
  controllers: [ZirpulseController],
  providers: [ZirpulseService],
  exports: [ZirpulseService],
})
export class ZirpulseModule {}
