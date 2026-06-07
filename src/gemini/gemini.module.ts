import { Module } from '@nestjs/common';
import { GeminiService } from '@app/gemini/gemini.service';
import { UsageModule } from '@app/models/usage.module';

@Module({
  imports: [UsageModule],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
