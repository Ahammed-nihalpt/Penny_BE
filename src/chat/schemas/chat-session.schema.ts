import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatSessionDocument = HydratedDocument<ChatSession>;

@Schema({ timestamps: true })
export class ChatSession {
  @Prop({ required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, default: 'New chat' })
  title!: string;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
