import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSharingConsent } from './entities/data-sharing-consent.entity';
import { DataAccessLog } from './entities/data-access-log.entity';
import { User } from '../users/entities/user.entity';
import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DataSharingConsent, DataAccessLog, User])],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
