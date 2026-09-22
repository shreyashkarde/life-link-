import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'ONGOING'
  | 'ARRIVED_AT_PATIENT'
  | 'ARRIVED_AT_HOSPITAL'
  | 'COMPLETED'
  | 'CANCELLED';

export type TripType = 'STANDARD' | 'SOS_EMERGENCY';

export interface IAmbulanceBooking extends Document {
  patientId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  ambulanceId?: mongoose.Types.ObjectId;
  hospitalId?: mongoose.Types.ObjectId;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  destinationLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  ambulanceType: 'BASIC' | 'ADVANCED_ALS' | 'OXYGEN_BLS';
  tripType: TripType;
  status: BookingStatus;
  fare: number;
  distanceKm: number;
  etaMinutes: number;
  driverLiveLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    lastUpdated?: Date;
  };
  patientCondition?: string;
  emergencyNotes?: string;
  isSOS: boolean;
  acceptedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AmbulanceBookingSchema = new Schema<IAmbulanceBooking>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    ambulanceId: { type: Schema.Types.ObjectId, ref: 'Ambulance' },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    pickupLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
    },
    destinationLocation: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String, default: 'Nearest Emergency Care Center' },
    },
    ambulanceType: {
      type: String,
      enum: ['BASIC', 'ADVANCED_ALS', 'OXYGEN_BLS'],
      default: 'BASIC',
    },
    tripType: {
      type: String,
      enum: ['STANDARD', 'SOS_EMERGENCY'],
      default: 'STANDARD',
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'ACCEPTED',
        'ONGOING',
        'ARRIVED_AT_PATIENT',
        'ARRIVED_AT_HOSPITAL',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'PENDING',
    },
    fare: { type: Number, default: 499 },
    distanceKm: { type: Number, default: 3.5 },
    etaMinutes: { type: Number, default: 8 },
    driverLiveLocation: {
      lat: { type: Number },
      lng: { type: Number },
      heading: { type: Number, default: 0 },
      lastUpdated: { type: Date },
    },
    patientCondition: { type: String, default: 'Stable / Standard Transfer' },
    emergencyNotes: { type: String, default: '' },
    isSOS: { type: Boolean, default: false },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const AmbulanceBooking = mongoose.model<IAmbulanceBooking>(
  'AmbulanceBooking',
  AmbulanceBookingSchema
);
