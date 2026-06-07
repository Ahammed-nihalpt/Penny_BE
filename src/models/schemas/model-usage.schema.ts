import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ModelUsageDocument = HydratedDocument<ModelUsage>;

// One doc per (model, date). Usage is global to the API key, not per-user.
@Schema({ timestamps: true })
export class ModelUsage {
  @Prop({ required: true })
  modelId!: string;

  @Prop({ required: true })
  date!: string; // YYYY-MM-DD (UTC)

  @Prop({ required: true, default: 0 })
  count!: number;

  @Prop({ required: true, default: false })
  rateLimited!: boolean;
}

export const ModelUsageSchema = SchemaFactory.createForClass(ModelUsage);
ModelUsageSchema.index({ modelId: 1, date: 1 }, { unique: true });
