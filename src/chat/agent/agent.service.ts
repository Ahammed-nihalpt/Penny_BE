import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { InvoicesService } from '@app/invoices/invoices.service';
import { UsersService } from '@app/users/users.service';
import { UsageService } from '@app/models/usage.service';
import { buildTools } from '@app/chat/agent/agent-tools';
import type { AgentAction, AgentResult, IAgentService } from '@app/chat/agent/agent.types';

@Injectable()
export class AgentService implements IAgentService {
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(
    config: ConfigService,
    private readonly invoices: InvoicesService,
    private readonly users: UsersService,
    private readonly usage: UsageService,
  ) {
    this.apiKey = config.get<string>('GEMINI_API_KEY', '');
    this.defaultModel = config.get<string>('GEMINI_MODEL', 'gemini-2.5-flash-lite');
  }

  async run(
    userId: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    signal?: AbortSignal,
  ): Promise<AgentResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Copilot is not configured (set GEMINI_API_KEY)');
    }
    const actions: AgentAction[] = [];
    const tools = buildTools(userId, this.invoices, this.users, actions);
    const user = await this.users.findById(userId);
    const model = user?.preferredModel ?? this.defaultModel;
    const displayName = user?.preferredName ?? user?.name;
    const llm = new ChatGoogleGenerativeAI({ model, apiKey: this.apiKey, temperature: 0 });

    const prompt =
      'You are Penny, a warm, concise invoice copilot for a small-business owner' +
      (displayName ? ` named ${displayName}` : '') +
      '. Use the tools to answer questions about their invoices and to take actions. ' +
      'To mark an invoice paid, first call query_invoices to find its id. ' +
      'If they ask you to call them a different name, use set_preferred_name to remember it. ' +
      'Confirm any action you took in plain language. ' +
      `Today is ${new Date().toISOString().slice(0, 10)}.`;

    const agent = createReactAgent({ llm, tools, prompt });

    const messages: BaseMessage[] = history.map((m) =>
      m.role === 'assistant' ? new AIMessage(m.content) : new HumanMessage(m.content),
    );

    try {
      const result = await agent.invoke(
        { messages },
        { signal, callbacks: [{ handleLLMStart: () => void this.usage.increment(model) }] },
      );
      // The final message's content may be a string OR an array of content blocks,
      // and a turn that only called a tool can leave it empty — walk back to the
      // last message with real prose, skipping raw JSON tool outputs.
      let reply = '';
      for (let i = result.messages.length - 1; i >= 0 && !reply; i--) {
        const text = this.messageText(result.messages[i]);
        if (text && !/^[[{]/.test(text)) reply = text;
      }
      return { reply: reply || 'Done.', actions };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number }).status;
      if (status === 429 || /429|too many requests|quota|rate limit/i.test(msg)) {
        await this.usage.markRateLimited(model);
      }
      throw err;
    }
  }

  private messageText(message: BaseMessage): string {
    const content = message.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part === 'string' ? part : ((part as { text?: string }).text ?? '')))
        .join('')
        .trim();
    }
    return '';
  }
}
