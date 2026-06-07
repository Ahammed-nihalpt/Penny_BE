import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { RefreshToken, RefreshTokenDocument } from '@app/auth/schemas/refresh-token.schema';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectModel(RefreshToken.name) private readonly model: Model<RefreshTokenDocument>,
    private readonly config: ConfigService,
  ) {}

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async issue(userId: string, userAgent?: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('base64url');
    const days = this.config.get<number>('REFRESH_TOKEN_TTL_DAYS', 7);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.model.create({ userId, tokenHash: this.hash(raw), expiresAt, userAgent });
    return raw;
  }

  async rotate(
    rawToken: string,
    userAgent?: string,
  ): Promise<{ userId: string; newToken: string }> {
    const existing = await this.model.findOne({ tokenHash: this.hash(rawToken) }).exec();
    if (!existing || existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.model.deleteOne({ _id: existing._id }).exec(); // single-use rotation
    const userId = existing.userId.toString();
    const newToken = await this.issue(userId, userAgent);
    return { userId, newToken };
  }

  async revoke(rawToken: string): Promise<void> {
    await this.model.deleteOne({ tokenHash: this.hash(rawToken) }).exec();
  }
}
