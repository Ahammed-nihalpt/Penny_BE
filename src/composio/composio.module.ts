import { Module } from '@nestjs/common';
import { ComposioService } from '@app/composio/composio.service';

@Module({
  providers: [ComposioService],
  exports: [ComposioService],
})
export class ComposioModule {}
