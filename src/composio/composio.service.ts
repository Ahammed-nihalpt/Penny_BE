import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Minimal shape of the bits of the Composio client we use, so we don't couple to
// the SDK's full types (and can load it lazily via dynamic import).
interface ComposioLike {
  tools: {
    execute: (
      slug: string,
      opts: {
        userId: string;
        arguments: Record<string, unknown>;
        version?: string;
        dangerouslySkipVersionCheck?: boolean;
      },
    ) => Promise<{ successful?: boolean; error?: string }>;
  };
}

@Injectable()
export class ComposioService {
  private readonly logger = new Logger(ComposioService.name);
  private readonly apiKey: string;
  // Composio scopes connected accounts (e.g. the Gmail you authorise) by a user
  // id. For this app one connected mailbox is shared, keyed by COMPOSIO_USER_ID.
  private readonly composioUserId: string;
  private clientPromise: Promise<ComposioLike | null> | null = null;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('COMPOSIO_API_KEY', '');
    this.composioUserId = config.get<string>('COMPOSIO_USER_ID', 'default');
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  // Lazily construct the client. Dynamic import keeps the (ESM) SDK out of the
  // CommonJS/Jest module graph and only loads it when a key is configured.
  private client(): Promise<ComposioLike | null> {
    if (!this.apiKey) return Promise.resolve(null);
    this.clientPromise ??= (async () => {
      const { Composio } = await import('@composio/core');
      // Pin the Gmail toolkit to its latest version. Manual tool execution
      // otherwise defaults to the base version, which lacks GMAIL_SEND_EMAIL.
      return new Composio({
        apiKey: this.apiKey,
        toolkitVersions: { gmail: 'latest' },
      }) as unknown as ComposioLike;
    })();
    return this.clientPromise;
  }

  // Sends an email via the user's Composio-connected Gmail. Returns true on
  // success; throws if Composio isn't configured or the send fails.
  async sendEmail(recipientEmail: string, subject: string, body: string): Promise<boolean> {
    const client = await this.client();
    if (!client) throw new Error('Composio is not configured');
    try {
      // Use the latest Gmail toolkit (the base version lacks GMAIL_SEND_EMAIL).
      // Manual execution rejects "latest" unless we explicitly skip the version
      // check — we opt in here rather than hardcode a version that goes stale.
      const res = await client.tools.execute('GMAIL_SEND_EMAIL', {
        userId: this.composioUserId,
        version: 'latest',
        dangerouslySkipVersionCheck: true,
        arguments: { recipient_email: recipientEmail, subject, body },
      });
      if (res.successful === false) {
        throw new Error(res.error ?? 'Email send failed');
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Composio GMAIL_SEND_EMAIL failed: ${msg}`);
      throw err;
    }
  }
}
