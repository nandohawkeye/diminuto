import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { RedirectController } from './redirect.controller';

@Module({
  providers: [RedirectService],
  controllers: [RedirectController],
})
export class RedirectModule {}
