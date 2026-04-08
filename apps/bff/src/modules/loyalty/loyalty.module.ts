import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyCacheService } from './loyalty.cache.service';
import { LoyaltySystemClient } from './loyalty-system.client';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyCacheService, LoyaltySystemClient],
  exports: [LoyaltyService, LoyaltyCacheService, LoyaltySystemClient],
})
export class LoyaltyModule {}
