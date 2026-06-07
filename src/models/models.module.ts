import { Module } from '@nestjs/common';
import { UsageModule } from '@app/models/usage.module';
import { UsersModule } from '@app/users/users.module';
import { ModelsService } from '@app/models/models.service';
import { ModelsController } from '@app/models/models.controller';

@Module({
  imports: [UsageModule, UsersModule],
  controllers: [ModelsController],
  providers: [ModelsService],
})
export class ModelsModule {}
