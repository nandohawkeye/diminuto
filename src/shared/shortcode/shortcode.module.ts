import { Global, Module } from '@nestjs/common';
import { ShortcodeService } from './shortcode.service';

@Global()
@Module({
  providers: [ShortcodeService],
  exports: [ShortcodeService],
})
export class ShortcodeModule {}
