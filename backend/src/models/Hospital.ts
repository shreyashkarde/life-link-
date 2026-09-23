import mongoose, { Document, Schema } from 'mongoose';

export interface IHospitalAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pincode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IHospital extends Document {
  name: string;
  address: IHospitalAddress | string;
  city: string;
  traumaLevel: string;
  totalBeds: number;
  icuBedsAvailable: number;
  adminEmail: string;
  adminId?: string;
  contactPhone: string;
  isActive: boolean;
  doctorsCount: number;
  driversCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: Schema.Types.Mixed, required: true },
    city: { type: String, default: 'Mumbai' },
    traumaLevel: { type: String, default: 'Level 1 Apex Trauma Center' },
    totalBeds: { type: Number, default: 200 },
    icuBedsAvailable: { type: Number, default: 20 },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    adminId: { type: String, default: '' },
    contactPhone: { type: String, default: '+91 22 2675 1000' },
    isActive: { type: Boolean, default: true },
    doctorsCount: { type: Number, default: 0 },
    driversCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Hospital = mongoose.models.Hospital || mongoose.model<IHospital>('Hospital', hospitalSchema);
export default Hospital;
