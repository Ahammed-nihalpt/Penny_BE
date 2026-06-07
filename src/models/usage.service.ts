import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ModelUsage, ModelUsageDocument } from '@app/models/schemas/model-usage.schema';

export interface ModelUsageToday {
  count: number;
  rateLimited: boolean;
}

@Injectable()
export class UsageService {
  constructor(@InjectModel(ModelUsage.name) private readonly model: Model<ModelUsageDocument>) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async increment(modelId: string): Promise<void> {
    await this.model
      .findOneAndUpdate({ modelId, date: this.today() }, { $inc: { count: 1 } }, { upsert: true })
      .exec();
  }

  async markRateLimited(modelId: string): Promise<void> {
    await this.model
      .findOneAndUpdate(
        { modelId, date: this.today() },
        { $set: { rateLimited: true } },
        { upsert: true },
      )
      .exec();
  }

  async getToday(): Promise<Record<string, ModelUsageToday>> {
    const docs = await this.model.find({ date: this.today() }).exec();
    const result: Record<string, ModelUsageToday> = {};
    for (const d of docs) {
      result[d.modelId] = { count: d.count, rateLimited: d.rateLimited };
    }
    return result;
  }
}
