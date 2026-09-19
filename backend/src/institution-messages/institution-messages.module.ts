import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionMessage } from './entities/institution-message.entity';
import { InstitutionMessageRead } from './entities/institution-message-read.entity';
import { InstitutionMember } from '../institutions/entities/institution-member.entity';
import { InstitutionMessagesService } from './institution-messages.service';
import { InstitutionMessagesController } from './institution-messages.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([InstitutionMessage, InstitutionMessageRead, InstitutionMember]),
  ],
  controllers: [InstitutionMessagesController],
  providers: [InstitutionMessagesService],
  exports: [InstitutionMessagesService],
})
export class InstitutionMessagesModule {}
