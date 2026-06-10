import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Sends transactional email via SMTP (e.g. Gmail with an app password).
// Env-gated: if SMTP isn't configured, it logs the link instead of throwing,
// so signup still works in dev/demo without real mail infrastructure.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST', '');
    const user = config.get<string>('SMTP_USER', '');
    const pass = config.get<string>('SMTP_PASS', '');
    this.from = config.get<string>('MAIL_FROM', '') || user;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT', 587),
        secure: config.get<boolean>('SMTP_SECURE', false), // true for port 465
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn('SMTP not configured — verification links will be logged, not emailed.');
    }
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  async sendVerificationEmail(to: string, link: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[mail disabled] verification link for ${to}: ${link}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Verify your email for AskPenny',
      text: `Welcome to AskPenny!\n\nConfirm your email by opening this link:\n${link}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`,
      html:
        `<p>Welcome to <strong>AskPenny</strong>!</p>` +
        `<p>Confirm your email to start using your invoice copilot:</p>` +
        `<p><a href="${link}" style="background:#0c8599;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Verify my email</a></p>` +
        `<p style="color:#666;font-size:13px">Or paste this link: ${link}<br>This link expires in 24 hours. If you didn't sign up, ignore this email.</p>`,
    });
  }
}
