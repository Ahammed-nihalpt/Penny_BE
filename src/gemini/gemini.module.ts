import { Module } from '@nestjs/common';
import { GeminiService } from '@app/gemini/gemini.service';

@Module({ providers: [GeminiService], exports: [GeminiService] })
export class GeminiModule {}
