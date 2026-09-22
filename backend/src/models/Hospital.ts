import mongoose, { Document, Schema } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  address: string;
  city: string;
  location: {
    lat: number;
    lng: number;
  };
  contactNumber: string;
  emergencyNumber: string;
  totalBeds: number;
  availableBeds: number;
  icuBedsAvailable: number;
  departments: string[];
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true, default: 'Mumbai' },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    contactNumber: { type: String, required: true },
    emergencyNumber: { type: String, required: true },
    totalBeds: { type: Number, default: 100 },
    availableBeds: { type: Number, default: 25 },
    icuBedsAvailable: { type: Number, default: 5 },
    departments: {
      type: [String],
      default: ['Emergency & Trauma', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Medicine'],
    },
    image: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Hospital = mongoose.model<IHospital>('Hospital', HospitalSchema);
