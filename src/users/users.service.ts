import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@app/users/schemas/user.schema';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  picture?: string;
  company?: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  create(data: CreateUserData): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  linkGoogle(userId: string, googleId: string, picture?: string): Promise<UserDocument | null> {
    const patch: Partial<CreateUserData> = { googleId };
    if (picture) patch.picture = picture;
    return this.userModel.findByIdAndUpdate(userId, patch, { new: true }).exec();
  }
}
