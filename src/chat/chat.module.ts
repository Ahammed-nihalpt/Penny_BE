import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatSession, ChatSessionSchema } from '@app/chat/schemas/chat-session.schema';
import { ChatMessage, ChatMessageSchema } from '@app/chat/schemas/chat-message.schema';
import { ChatService } from '@app/chat/chat.service';
import { ChatController } from '@app/chat/chat.controller';
import { AgentService } from '@app/chat/agent/agent.service';
import { AGENT_SERVICE } from '@app/chat/agent/agent.types';
import { UsersModule } from '@app/users/users.module';
import { InvoicesModule } from '@app/invoices/invoices.module';
import { UsageModule } from '@app/models/usage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    UsersModule,
    InvoicesModule,
    UsageModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, { provide: AGENT_SERVICE, useClass: AgentService }],
  exports: [ChatService],
})
export class ChatModule {}
