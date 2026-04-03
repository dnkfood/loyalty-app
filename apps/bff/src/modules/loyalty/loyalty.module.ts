import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyCacheService } from './loyalty.cache.service';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyCacheService],
  exports: [LoyaltyService, LoyaltyCacheService],
})
export class LoyaltyModule {}
