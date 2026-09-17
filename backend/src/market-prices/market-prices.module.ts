import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketPrice } from './entities/market-price.entity';
import { MarketPricesService } from './market-prices.service';
import { MarketPricesController } from './market-prices.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketPrice]),
  ],
  controllers: [MarketPricesController],
  providers: [MarketPricesService],
  exports: [MarketPricesService],
})
export class MarketPricesModule {}
