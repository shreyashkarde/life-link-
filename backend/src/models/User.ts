import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'DRIVER' | 'ADMIN_HOSPITAL' | 'SUPER_ADMIN';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  hospitalId?: mongoose.Types.ObjectId;
  googleId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 6 },
    role: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'DRIVER', 'ADMIN_HOSPITAL', 'SUPER_ADMIN'],
      default: 'PATIENT',
      required: true,
    },
    phone: { type: String, trim: true },
    avatar: { type: String, default: '' },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    googleId: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
