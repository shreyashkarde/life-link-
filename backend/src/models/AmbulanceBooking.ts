import mongoose, { Document, Schema } from 'mongoose';

export type BookingType = 'NORMAL' | 'EMERGENCY_SOS';
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type EmergencySeverity = 'LOW' | 'MEDIUM' | 'CRITICAL_CODE_RED';
export type PaymentStatus = 'PENDING' | 'PAID_ONLINE' | 'CASH';

export interface ILocationPoint {
  address: string;
  lat: number;
  lng: number;
}

export interface IBookingTimeline {
  bookedAt: Date;
  acceptedAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface IAmbulanceBooking extends Document {
  patientId: string;
  patientName: string;
  patientPhone: string;
  ambulanceId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  pickupLocation: ILocationPoint;
  destinationHospital: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  bookingType: BookingType;
  status: BookingStatus;
  emergencySeverity: EmergencySeverity;
  patientCondition?: string;
  fare: number;
  paymentStatus: PaymentStatus;
  timeline: IBookingTimeline;
  createdAt: Date;
  updatedAt: Date;
}

const ambulanceBookingSchema = new Schema<IAmbulanceBooking>(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    ambulanceId: { type: String, required: false },
    driverName: { type: String, required: false },
    driverPhone: { type: String, required: false },
    vehicleNumber: { type: String, required: false },
    pickupLocation: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    destinationHospital: {
      name: { type: String, default: 'City Care Central Hospital' },
      address: { type: String, default: 'Trauma Bay & Emergency Ward, Sector 4' },
      lat: { type: Number, default: 19.0760 },
      lng: { type: Number, default: 72.8777 },
    },
    bookingType: {
      type: String,
      enum: ['NORMAL', 'EMERGENCY_SOS'],
      default: 'NORMAL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    emergencySeverity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'CRITICAL_CODE_RED'],
      default: 'MEDIUM',
    },
    patientCondition: { type: String, default: 'Urgent Care Request' },
    fare: { type: Number, default: 120 },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID_ONLINE', 'CASH'],
      default: 'PENDING',
    },
    timeline: {
      bookedAt: { type: Date, default: Date.now },
      acceptedAt: { type: Date },
      arrivedAt: { type: Date },
      completedAt: { type: Date },
      cancelledAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const AmbulanceBooking =
  mongoose.models.AmbulanceBooking ||
  mongoose.model<IAmbulanceBooking>('AmbulanceBooking', ambulanceBookingSchema);
export default AmbulanceBooking;
