import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import { INVOICE_CATEGORIES } from '@app/invoices/invoice-category';
import type { InvoiceCategory } from '@app/invoices/invoice-category';
import { UsageService } from '@app/models/usage.service';

export interface InvoiceDraft {
  vendor: string;
  email?: string;
  amount: number;
  category: InvoiceCategory;
  dueDate: string; // YYYY-MM-DD
  issuedDate?: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI | null;
  private readonly model: string;

  constructor(
    config: ConfigService,
    private readonly usage: UsageService,
  ) {
    const apiKey = config.get<string>('GEMINI_API_KEY', '');
    this.model = config.get<string>('GEMINI_MODEL', 'gemini-2.5-flash-lite');
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  // Maps raw model output to a safe InvoiceDraft (clamps category, coerces types).
  normalizeDraft(raw: Record<string, unknown>): InvoiceDraft {
    // Safe string coercion: model JSON values are unknown; only stringify primitives.
    const str = (v: unknown): string =>
      typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
    const category = INVOICE_CATEGORIES.includes(raw.category as InvoiceCategory)
      ? (raw.category as InvoiceCategory)
      : 'Other';
    const amount = typeof raw.amount === 'number' ? raw.amount : Number(str(raw.amount)) || 0;
    const toDate = (v: unknown): string => {
      const d = new Date(str(v));
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    };
    const email = str(raw.email);
    return {
      vendor: str(raw.vendor).trim(),
      email: email || undefined,
      amount,
      category,
      dueDate: toDate(raw.dueDate),
      issuedDate: toDate(raw.issuedDate) || undefined,
    };
  }

  async extractInvoice(buffer: Buffer, mimeType: string): Promise<InvoiceDraft> {
    if (!this.client) {
      throw new ServiceUnavailableException('Vision is not configured (set GEMINI_API_KEY)');
    }
    const prompt =
      'You are reading a business invoice. Extract these fields and return JSON only. ' +
      'amount = total amount due as a number; category = the closest of the allowed values; ' +
      'dates as YYYY-MM-DD. If a field is missing, use an empty string (or 0 for amount).';
    const schema = {
      type: Type.OBJECT,
      properties: {
        vendor: { type: Type.STRING },
        email: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        category: { type: Type.STRING, enum: [...INVOICE_CATEGORIES] },
        dueDate: { type: Type.STRING },
        issuedDate: { type: Type.STRING },
      },
      required: ['vendor', 'amount', 'category', 'dueDate'],
    };

    const text = await this.callWithBackoff(async () => {
      await this.usage.increment(this.model);
      const response = await this.client!.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }, { inlineData: { mimeType, data: buffer.toString('base64') } }],
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      return response.text ?? '';
    }, this.model);

    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return this.normalizeDraft(parsed);
    } catch {
      throw new UnprocessableEntityException(
        "Couldn't read this invoice — try a clearer photo or enter it manually",
      );
    }
  }

  async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userContext?: string,
  ): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('Chat is not configured (set GEMINI_API_KEY)');
    }
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const systemInstruction =
      'You are Penny, a warm, concise assistant inside an invoice-management app ' +
      'for small-business owners. Remember details the user shares during the chat. ' +
      'You cannot yet access their invoice data — if asked, say that capability is coming soon.' +
      (userContext ? ` ${userContext}` : '');
    return this.callWithBackoff(async () => {
      const response = await this.client!.models.generateContent({
        model: this.model,
        contents,
        config: { systemInstruction },
      });
      return response.text ?? '';
    });
  }

  private async callWithBackoff<T>(
    fn: () => Promise<T>,
    modelId?: string,
    retries = 3,
  ): Promise<T> {
    let delayMs = 1000;
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 429) {
          if (modelId) void this.usage.markRateLimited(modelId);
          if (attempt < retries) {
            this.logger.warn(`Gemini rate-limited (429) — retrying in ${delayMs}ms`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            delayMs *= 2;
            continue;
          }
        }
        throw err;
      }
    }
  }
}
