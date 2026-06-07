import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envValidationSchema } from '@app/config/env.validation';
import { HealthModule } from '@app/health/health.module';
import { AuthModule } from '@app/auth/auth.module';
import { InvoicesModule } from '@app/invoices/invoices.module';
import { ChatModule } from '@app/chat/chat.module';
import { ModelsModule } from '@app/models/models.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
        dbName: 'penny',
      }),
    }),
    // Default rate limit applied app-wide; auth endpoints tighten it with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    HealthModule,
    AuthModule,
    InvoicesModule,
    ChatModule,
    ModelsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
