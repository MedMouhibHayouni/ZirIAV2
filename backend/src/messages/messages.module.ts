import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    NotificationModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
