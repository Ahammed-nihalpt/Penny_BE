import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '@app/users/users.service';
import { RefreshTokensService } from '@app/auth/refresh-tokens.service';
import { GoogleVerifierService } from '@app/auth/google-verifier.service';
import { EmailVerifyService } from '@app/auth/email-verify.service';
import { MailService } from '@app/mail/mail.service';
import { SignupDto } from '@app/auth/dto/signup.dto';
import { LoginDto } from '@app/auth/dto/login.dto';
import { GoogleAuthDto } from '@app/auth/dto/google-auth.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Thrown when valid credentials belong to an unverified account. The controller
// surfaces the `code` so the frontend can show a "verify your email" prompt.
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensService,
    private readonly googleVerifier: GoogleVerifierService,
    private readonly emailVerify: EmailVerifyService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  // Hard gate: signup creates an unverified user and emails a link, but does NOT
  // log them in. They must verify before they can obtain a session.
  async signup(dto: SignupDto): Promise<{ verificationRequired: true }> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      company: dto.company,
      emailVerified: false,
    });
    await this.sendVerification(user.id, user.email);
    return { verificationRequired: true };
  }

  async login(dto: LoginDto, userAgent?: string): Promise<TokenPair> {
    const user = await this.users.findByEmail(dto.email);
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Only reveal verification status AFTER the password checks out (no enumeration).
    if (!user.emailVerified) {
      throw new ForbiddenException({ code: EMAIL_NOT_VERIFIED, message: 'Email not verified' });
    }
    return this.issueTokens(user.id, user.email, userAgent);
  }

  async refresh(rawToken: string, userAgent?: string): Promise<TokenPair> {
    const { userId, newToken } = await this.refreshTokens.rotate(rawToken, userAgent);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    // Kicks out any pre-existing session belonging to an unverified account.
    if (!user.emailVerified) throw new UnauthorizedException('Email not verified');
    return {
      accessToken: this.jwt.sign({ sub: user.id, email: user.email }),
      refreshToken: newToken,
    };
  }

  async google(dto: GoogleAuthDto, userAgent?: string): Promise<TokenPair> {
    const profile = await this.googleVerifier.verify(dto.idToken);
    if (!profile.emailVerified) {
      throw new UnauthorizedException('Google email not verified');
    }
    let user = await this.users.findByEmail(profile.email);
    if (user) {
      // linkGoogle also marks the account verified; if already linked but somehow
      // unverified, ensure it's verified (Google vouches for the address).
      if (!user.googleId) {
        user = (await this.users.linkGoogle(user.id, profile.googleId)) ?? user;
      } else if (!user.emailVerified) {
        user = (await this.users.markEmailVerified(user.id)) ?? user;
      }
    } else {
      user = await this.users.create({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        emailVerified: true,
      });
    }
    return this.issueTokens(user.id, user.email, userAgent);
  }

  async verifyEmail(token: string): Promise<{ verified: true }> {
    const userId = this.emailVerify.verify(token); // throws if invalid/expired
    await this.users.markEmailVerified(userId); // idempotent if already verified
    return { verified: true };
  }

  // Always returns ok (no account enumeration); only actually sends for an
  // existing, still-unverified password account.
  async resendVerification(email: string): Promise<{ ok: true }> {
    const user = await this.users.findByEmail(email);
    if (user && user.passwordHash && !user.emailVerified) {
      await this.sendVerification(user.id, user.email);
    }
    return { ok: true };
  }

  async logout(rawToken?: string): Promise<void> {
    if (rawToken) await this.refreshTokens.revoke(rawToken);
  }

  private async sendVerification(userId: string, email: string): Promise<void> {
    const token = this.emailVerify.sign(userId);
    // Dedicated public base for email links; falls back to FRONTEND_URL, then dev default.
    const base =
      this.config.get<string>('APP_URL') ??
      this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const link = `${base}/verify-email?token=${encodeURIComponent(token)}`;
    await this.mail.sendVerificationEmail(email, link);
  }

  private async issueTokens(userId: string, email: string, userAgent?: string): Promise<TokenPair> {
    const accessToken = this.jwt.sign({ sub: userId, email });
    const refreshToken = await this.refreshTokens.issue(userId, userAgent);
    return { accessToken, refreshToken };
  }
}
