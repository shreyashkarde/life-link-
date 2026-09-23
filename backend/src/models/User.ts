import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'DRIVER' | 'ADMIN_HOSPITAL' | 'SUPER_ADMIN';

export interface IUserAddress {
  line1: string;
  line2: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  image: string;
  address: IUserAddress;
  gender: string;
  dob: string;
  phone: string;
  googleId?: string;
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    role: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'DRIVER', 'ADMIN_HOSPITAL', 'SUPER_ADMIN'],
      default: 'PATIENT',
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
    address: {
      type: Object,
      default: { line1: '', line2: '', city: 'Mumbai', coordinates: { lat: 19.0760, lng: 72.8777 } },
    },
    gender: { type: String, default: 'Not Selected' },
    dob: { type: String, default: 'Not Selected' },
    phone: { type: String, default: '0000000000' },
    googleId: { type: String, required: false },
    isVerified: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default User;
