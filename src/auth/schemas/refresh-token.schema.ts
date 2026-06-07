import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class RefreshToken {
  @Prop({ required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  // expireAfterSeconds: 0 → Mongo deletes the doc once expiresAt passes (TTL index).
  @Prop({ required: true, index: { expireAfterSeconds: 0 } })
  expiresAt: Date;

  @Prop()
  userAgent?: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
