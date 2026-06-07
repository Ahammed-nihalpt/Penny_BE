import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

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
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
