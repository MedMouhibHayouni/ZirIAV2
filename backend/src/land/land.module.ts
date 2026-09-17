import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandController } from './land.controller';
import { LandService } from './land.service';
import { LandAuctionService } from './land-auction.service';
import { LandListing } from './entities/land-listing.entity';
import { LandAuction } from './entities/land-auction.entity';
import { LandBid } from './entities/land-bid.entity';
import { LandValuation } from './entities/land-valuation.entity';

import { LandAuctionGateway } from './land-auction.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LandListing, LandAuction, LandBid, LandValuation]),
    AuthModule
  ],
  controllers: [LandController],
  providers: [LandService, LandAuctionService, LandAuctionGateway],
  exports: [LandService, LandAuctionService],
})
export class LandModule {}
