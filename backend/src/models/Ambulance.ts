import mongoose, { Document, Schema } from 'mongoose';

export type AmbulanceType = 'BASIC' | 'ADVANCED_ALS' | 'OXYGEN_BLS';
export type AmbulanceStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFFLINE';

export interface IAmbulance extends Document {
  driverId: mongoose.Types.ObjectId;
  hospitalId?: mongoose.Types.ObjectId;
  vehicleNumber: string;
  vehicleModel: string;
  ambulanceType: AmbulanceType;
  isOnline: boolean;
  status: AmbulanceStatus;
  currentLocation: {
    lat: number;
    lng: number;
    address?: string;
    heading?: number;
    speed?: number;
    lastUpdated: Date;
  };
  baseFare: number;
  perKmRate: number;
  averageRating: number;
  totalRides: number;
  equipmentList: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AmbulanceSchema = new Schema<IAmbulance>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
    vehicleModel: { type: String, default: 'Force Traveller Medical Van' },
    ambulanceType: {
      type: String,
      enum: ['BASIC', 'ADVANCED_ALS', 'OXYGEN_BLS'],
      default: 'BASIC',
    },
    isOnline: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ON_TRIP', 'OFFLINE'],
      default: 'OFFLINE',
    },
    currentLocation: {
      lat: { type: Number, required: true, default: 19.076 },
      lng: { type: Number, required: true, default: 72.8777 },
      address: { type: String, default: 'Central Hub Station' },
      heading: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    baseFare: { type: Number, default: 499 },
    perKmRate: { type: Number, default: 25 },
    averageRating: { type: Number, default: 4.9 },
    totalRides: { type: Number, default: 0 },
    equipmentList: {
      type: [String],
      default: ['ECG Monitor', 'Oxygen Cylinder', 'First Aid Trauma Kit', 'Stretcher Bed', 'Suction Machine'],
    },
  },
  { timestamps: true }
);

export const Ambulance = mongoose.model<IAmbulance>('Ambulance', AmbulanceSchema);
