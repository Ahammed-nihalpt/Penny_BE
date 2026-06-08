import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { AgentAction } from '@app/chat/agent/agent.types';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ChatMessage {
  @Prop({ required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  sessionId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @Prop({ required: true })
  content!: string;

  // The tools the agent ran on this turn (assistant messages only). Persisted so
  // the chat can show "what Penny did" even after a reload, and ground answers
  // in the specific invoices she touched.
  @Prop({ type: [{ _id: false, tool: String, invoiceIds: [String] }] })
  actions?: AgentAction[];
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
