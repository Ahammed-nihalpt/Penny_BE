import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from '@app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // All routes are served under /api (matches the FE contract).
  app.setGlobalPrefix('api');

  // Reject any request body that doesn't match its DTO; strip unknown fields.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Parse cookies (the refresh token rides in an httpOnly cookie).
  app.use(cookieParser());

  // Credentialed CORS: the origin MUST be explicit (not '*') for the cookie to work.
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL'), credentials: true });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
