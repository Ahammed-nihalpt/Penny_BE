import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@app/users/schemas/user.schema';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  company?: string;
  emailVerified?: boolean;
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

  linkGoogle(userId: string, googleId: string): Promise<UserDocument | null> {
    // Linking Google implies a Google-verified address → mark verified.
    return this.userModel
      .findByIdAndUpdate(userId, { googleId, emailVerified: true }, { returnDocument: 'after' })
      .exec();
  }

  markEmailVerified(userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { emailVerified: true }, { returnDocument: 'after' })
      .exec();
  }

  setPreferredModel(userId: string, preferredModel: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { preferredModel }, { returnDocument: 'after' })
      .exec();
  }

  setPreferredName(userId: string, preferredName: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { preferredName }, { returnDocument: 'after' })
      .exec();
  }
}
