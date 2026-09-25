import mongoose, { Document, Schema } from 'mongoose';

export type AmbulanceType = 'BASIC' | 'ADVANCED' | 'ICU' | 'NEONATAL';
export type AmbulanceStatus = 'IDLE' | 'ASSIGNED' | 'EN_ROUTE_PICKUP' | 'PATIENT_ONBOARD' | 'COMPLETED';

export interface IAmbulanceLocation {
  lat: number;
  lng: number;
  address?: string;
  heading?: number;
  lastUpdated: Date;
}

export interface IAmbulance extends Document {
  driverName: string;
  driverPhone: string;
  driverEmail: string;
  driverId?: string;
  vehicleNumber: string;
  ambulanceType: AmbulanceType;
  currentLocation: IAmbulanceLocation;
  isAvailable: boolean; // Online / Offline toggle
  currentStatus: AmbulanceStatus;
  assignedHospital: string;
  hospitalId?: string;
  hospitalName?: string;
  rating: number;
  reviewCount: number;
  equipmentList?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ambulanceSchema = new Schema<IAmbulance>(
  {
    driverName: { type: String, required: true },
    driverPhone: { type: String, required: true },
    driverEmail: { type: String, required: true },
    driverId: { type: String, required: false, index: true },
    vehicleNumber: { type: String, required: true, unique: true },
    ambulanceType: {
      type: String,
      enum: ['BASIC', 'ADVANCED', 'ICU', 'NEONATAL'],
      default: 'ADVANCED',
    },
    currentLocation: {
      lat: { type: Number, default: 19.0760 },
      lng: { type: Number, default: 72.8777 },
      address: { type: String, default: 'Central Emergency Station' },
      heading: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    isAvailable: { type: Boolean, default: true },
    currentStatus: {
      type: String,
      enum: ['IDLE', 'ASSIGNED', 'EN_ROUTE_PICKUP', 'PATIENT_ONBOARD', 'COMPLETED'],
      default: 'IDLE',
    },
    assignedHospital: { type: String, default: 'Lilavati Hospital & Research Centre' },
    hospitalId: { type: String, default: 'hosp_lilavati', ref: 'Hospital', index: true },
    hospitalName: { type: String, default: 'Lilavati Hospital & Research Centre' },
    rating: { type: Number, default: 4.9 },
    reviewCount: { type: Number, default: 35 },
    equipmentList: {
      type: [String],
      default: ['Oxygen Tank', 'Defibrillator (AED)', 'ECG Monitor', 'Emergency Stretcher', 'First-Aid Trauma Kit'],
    },
  },
  { timestamps: true }
);

ambulanceSchema.index({ hospitalId: 1, isAvailable: 1 });
ambulanceSchema.index({ hospitalId: 1, currentStatus: 1 });

export const Ambulance = mongoose.models.Ambulance || mongoose.model<IAmbulance>('Ambulance', ambulanceSchema);
export const Driver = Ambulance;
export default Ambulance;
