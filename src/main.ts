import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All routes are served under /api (matches the FE contract).
  app.setGlobalPrefix('api');

  // Reject any request body that doesn't match its DTO; strip unknown fields.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Allow the React dev server (and later, the deployed FE) to call this API.
  app.enableCors({ origin: true, credentials: true });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
