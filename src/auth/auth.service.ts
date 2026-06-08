import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '@app/users/users.service';
import { RefreshTokensService } from '@app/auth/refresh-tokens.service';
import { GoogleVerifierService } from '@app/auth/google-verifier.service';
import { SignupDto } from '@app/auth/dto/signup.dto';
import { LoginDto } from '@app/auth/dto/login.dto';
import { GoogleAuthDto } from '@app/auth/dto/google-auth.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensService,
    private readonly googleVerifier: GoogleVerifierService,
  ) {}

  async signup(dto: SignupDto, userAgent?: string): Promise<TokenPair> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      company: dto.company,
    });
    return this.issueTokens(user.id, user.email, userAgent);
  }

  async login(dto: LoginDto, userAgent?: string): Promise<TokenPair> {
    const user = await this.users.findByEmail(dto.email);
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.email, userAgent);
  }

  async refresh(rawToken: string, userAgent?: string): Promise<TokenPair> {
    const { userId, newToken } = await this.refreshTokens.rotate(rawToken, userAgent);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
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
      if (!user.googleId) {
        user = (await this.users.linkGoogle(user.id, profile.googleId)) ?? user;
      }
    } else {
      user = await this.users.create({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
      });
    }
    return this.issueTokens(user.id, user.email, userAgent);
  }

  async logout(rawToken?: string): Promise<void> {
    if (rawToken) await this.refreshTokens.revoke(rawToken);
  }

  private async issueTokens(userId: string, email: string, userAgent?: string): Promise<TokenPair> {
    const accessToken = this.jwt.sign({ sub: userId, email });
    const refreshToken = await this.refreshTokens.issue(userId, userAgent);
    return { accessToken, refreshToken };
  }
}
