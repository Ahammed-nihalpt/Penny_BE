import { BadRequestException, Injectable } from '@nestjs/common';
import { UsageService } from '@app/models/usage.service';
import { UsersService } from '@app/users/users.service';
import { AVAILABLE_MODELS, DEFAULT_MODEL, MODEL_IDS } from '@app/models/available-models';

@Injectable()
export class ModelsService {
  constructor(
    private readonly usage: UsageService,
    private readonly users: UsersService,
  ) {}

  async list(userId: string) {
    const usage = await this.usage.getToday();
    const user = await this.users.findById(userId);
    const current = user?.preferredModel ?? DEFAULT_MODEL;
    const models = AVAILABLE_MODELS.map((m) => {
      const used = usage[m.id]?.count ?? 0;
      return {
        id: m.id,
        label: m.label,
        dailyLimit: m.dailyLimit,
        usedToday: used,
        remaining: Math.max(0, m.dailyLimit - used),
        rateLimited: usage[m.id]?.rateLimited ?? false,
      };
    });
    return { models, current };
  }

  async select(userId: string, model: string): Promise<{ current: string }> {
    if (!MODEL_IDS.includes(model)) throw new BadRequestException('Unknown model');
    await this.users.setPreferredModel(userId, model);
    return { current: model };
  }
}
