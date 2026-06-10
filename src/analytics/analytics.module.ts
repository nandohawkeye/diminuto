import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsListener } from './analytics.listener';

@Module({
  providers: [AnalyticsService, AnalyticsListener],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
