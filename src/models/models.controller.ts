import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import type { AuthUser } from '@app/auth/strategies/jwt.strategy';
import { ModelsService } from '@app/models/models.service';
import { SelectModelDto } from '@app/models/dto/select-model.dto';

@UseGuards(JwtAuthGuard)
@Controller('models')
export class ModelsController {
  constructor(private readonly models: ModelsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.models.list(user.id);
  }

  @Post('select')
  select(@CurrentUser() user: AuthUser, @Body() dto: SelectModelDto) {
    return this.models.select(user.id, dto.model);
  }
}
