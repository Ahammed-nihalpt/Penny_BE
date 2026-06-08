import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDocument } from '@app/chat/schemas/chat-session.schema';
import { ChatMessage, ChatMessageDocument } from '@app/chat/schemas/chat-message.schema';
import { AGENT_SERVICE } from '@app/chat/agent/agent.types';
import type { AgentAction, IAgentService } from '@app/chat/agent/agent.types';

const HISTORY_LIMIT = 10;

export interface SendMessageResult {
  message: ChatMessageDocument;
  actions: AgentAction[];
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatSession.name) private readonly sessions: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name) private readonly messages: Model<ChatMessageDocument>,
    @Inject(AGENT_SERVICE) private readonly agent: IAgentService,
  ) {}

  createSession(userId: string): Promise<ChatSessionDocument> {
    return this.sessions.create({ userId, title: 'New chat' });
  }

  listSessions(userId: string): Promise<ChatSessionDocument[]> {
    return this.sessions.find({ userId }).sort({ updatedAt: -1 }).exec();
  }

  async getMessages(userId: string, sessionId: string): Promise<ChatMessageDocument[]> {
    await this.ownSession(userId, sessionId);
    return this.messages.find({ userId, sessionId }).sort({ createdAt: 1 }).exec();
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    await this.ownSession(userId, sessionId);
    await this.messages.deleteMany({ userId, sessionId }).exec();
    await this.sessions.deleteOne({ _id: sessionId, userId }).exec();
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    content: string,
    signal?: AbortSignal,
    onToken?: (token: string) => void,
  ): Promise<SendMessageResult> {
    const session = await this.ownSession(userId, sessionId);
    await this.messages.create({ userId, sessionId, role: 'user', content });

    // First user message → use it as the session title.
    if (session.title === 'New chat') {
      await this.sessions.findByIdAndUpdate(sessionId, { title: content.slice(0, 50) }).exec();
    }

    const recent = await this.messages
      .find({ userId, sessionId })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .exec();
    const history = recent.reverse().map((m) => ({ role: m.role, content: m.content }));

    const { reply, actions } = await this.agent.run(userId, history, signal, onToken);
    const message = await this.messages.create({
      userId,
      sessionId,
      role: 'assistant',
      content: reply,
      actions,
    });
    return { message, actions };
  }

  private async ownSession(userId: string, sessionId: string): Promise<ChatSessionDocument> {
    const session = await this.sessions.findOne({ _id: sessionId, userId }).exec();
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }
}
