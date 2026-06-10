import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '@app/users/users.module';
import { AuthService } from '@app/auth/auth.service';
import { AuthController } from '@app/auth/auth.controller';
import { JwtStrategy } from '@app/auth/strategies/jwt.strategy';
import { RefreshTokensService } from '@app/auth/refresh-tokens.service';
import { GoogleVerifierService } from '@app/auth/google-verifier.service';
import { EmailVerifyService } from '@app/auth/email-verify.service';
import { MailModule } from '@app/mail/mail.module';
import { RefreshToken, RefreshTokenSchema } from '@app/auth/schemas/refresh-token.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    MongooseModule.forFeature([{ name: RefreshToken.name, schema: RefreshTokenSchema }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('ACCESS_TOKEN_TTL', '15m') as NonNullable<
            JwtModuleOptions['signOptions']
          >['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokensService,
    GoogleVerifierService,
    EmailVerifyService,
  ],
})
export class AuthModule {}
