import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop()
  passwordHash?: string;

  @Prop()
  googleId?: string;

  @Prop()
  picture?: string;

  @Prop()
  company?: string;

  @Prop()
  preferredModel?: string;

  @Prop()
  preferredName?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
