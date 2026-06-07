import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import type { AuthUser } from '@app/auth/strategies/jwt.strategy';
import { ChatService } from '@app/chat/chat.service';
import { SendMessageDto } from '@app/chat/dto/send-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('sessions')
  createSession(@CurrentUser() user: AuthUser) {
    return this.chat.createSession(user.id);
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthUser) {
    return this.chat.listSessions(user.id);
  }

  @Get('sessions/:id/messages')
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.getMessages(user.id, id);
  }

  @Post('sessions/:id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    // Cancel the agent run if the client disconnects (the Stop button aborts the request).
    const ac = new AbortController();
    req.on('close', () => ac.abort());
    return this.chat.sendMessage(user.id, id, dto.content, ac.signal);
  }

  @Delete('sessions/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.deleteSession(user.id, id);
  }
}
