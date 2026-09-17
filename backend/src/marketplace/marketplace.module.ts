import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { MediaManagementService } from './media-management.service';
import { MarketplaceListing } from './entities/marketplace-listing.entity';
import { MarketplaceConnection } from './entities/marketplace-connection.entity';
import { MarketplaceInquiry } from './entities/marketplace-inquiry.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { User } from '../users/entities/user.entity';
import { NotificationModule } from '../notifications/notification.module';
import { SubscriptionModule } from '../subscriptions/subscription.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UploadModule } from '../upload/upload.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketplaceListing,
      MarketplaceConnection,
      MarketplaceInquiry,
      Inventory,
      User,
    ]),
    NotificationModule,
    SubscriptionModule,
    TransactionsModule,
    UploadModule,
    MessagesModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MediaManagementService],
  exports: [MarketplaceService, MediaManagementService],
})
export class MarketplaceModule {}
