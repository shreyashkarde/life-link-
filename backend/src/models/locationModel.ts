import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  userId: string;
  role: 'patient' | 'driver';
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: Date;
}

const LocationSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['patient', 'driver'], required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    heading: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Fallback in-memory location cache for non-blocking real-time telemetry
export const memoryLocationStore = new Map<
  string,
  {
    userId: string;
    role: 'patient' | 'driver';
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    updatedAt: Date;
  }
>();

export const Location = mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema);
export default Location;
