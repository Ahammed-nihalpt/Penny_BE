import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface VerifyPayload {
  sub: string;
  purpose?: string;
}

// Signs/verifies the email-verification magic-link token. Uses a SEPARATE secret
// (derived from JWT_SECRET) and a `purpose` claim, so a verification token can
// never be used as an access token (and vice-versa). Stateless + self-expiring,
// so no DB collection or cleanup job is needed.
@Injectable()
export class EmailVerifyService {
  private readonly secret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET') + '::email-verify';
  }

  sign(userId: string): string {
    return this.jwt.sign(
      { sub: userId, purpose: 'email_verify' },
      { secret: this.secret, expiresIn: '24h' },
    );
  }

  verify(token: string): string {
    let payload: VerifyPayload;
    try {
      payload = this.jwt.verify<VerifyPayload>(token, { secret: this.secret });
    } catch {
      throw new UnauthorizedException('This verification link is invalid or has expired.');
    }
    if (payload.purpose !== 'email_verify') {
      throw new UnauthorizedException('This verification link is invalid or has expired.');
    }
    return payload.sub;
  }
}
