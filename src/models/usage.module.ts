import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelUsage, ModelUsageSchema } from '@app/models/schemas/model-usage.schema';
import { UsageService } from '@app/models/usage.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ModelUsage.name, schema: ModelUsageSchema }])],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
