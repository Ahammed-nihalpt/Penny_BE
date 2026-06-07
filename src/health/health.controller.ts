import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check() {
    const connected = this.connection.readyState === ConnectionStates.connected;
    return {
      status: 'ok',
      db: connected ? 'connected' : 'disconnected',
    };
  }
}
