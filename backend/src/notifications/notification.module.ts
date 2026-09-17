import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { User } from '../users/entities/user.entity';
import { NotificationRecord } from './entities/notification-record.entity';
import { AuthModule } from '../auth/auth.module';
import { FirebaseAdminService } from './firebase-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, NotificationRecord]),
    AuthModule
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, FirebaseAdminService],
  exports: [NotificationService, FirebaseAdminService, NotificationGateway],
})
export class NotificationModule {}
