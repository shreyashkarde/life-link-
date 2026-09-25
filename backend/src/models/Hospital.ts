import mongoose, { Document, Schema } from 'mongoose';

export interface IHospitalLocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
  lat?: number;
  lng?: number;
}

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
  phone: string;
  contactPhone: string;
  emergencyContact?: string;
  location: IHospitalLocation | { lat: number; lng: number };
  lat?: number;
  lng?: number;
  traumaLevel: string;
  totalBeds: number;
  icuBedsAvailable: number;
  adminEmail: string;
  adminId?: string;
  isActive: boolean;
  doctorsCount: number;
  driversCount: number;
  rating?: number;
  specialities?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: Schema.Types.Mixed, required: true },
    city: { type: String, default: 'Mumbai' },
    phone: { type: String, default: '+91 22 2675 1000' },
    contactPhone: { type: String, default: '+91 22 2675 1000' },
    emergencyContact: { type: String, default: '+91 22 2656 8000' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [72.8295, 19.0522],
      },
      lat: { type: Number, default: 19.0522 },
      lng: { type: Number, default: 72.8295 },
    },
    lat: { type: Number, default: 19.0522 },
    lng: { type: Number, default: 72.8295 },
    traumaLevel: { type: String, default: 'Level 1 Apex Trauma Center' },
    totalBeds: { type: Number, default: 200 },
    icuBedsAvailable: { type: Number, default: 20 },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    adminId: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    doctorsCount: { type: Number, default: 0 },
    driversCount: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },
    specialities: {
      type: [String],
      default: ['General physician', 'Cardiology', 'Emergency Care', 'Orthopedics'],
    },
  },
  { timestamps: true }
);

// 🌍 Geospatial 2dsphere indexing for $near queries
hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ name: 1, isActive: 1 });
hospitalSchema.index({ city: 1, isActive: 1 });

export const Hospital = mongoose.models.Hospital || mongoose.model<IHospital>('Hospital', hospitalSchema);
export default Hospital;

