import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctorAddress {
  line1: string;
  line2: string;
}

export interface IDoctor extends Document {
  name: string;
  email: string;
  password?: string;
  image: string;
  speciality: string;
  degree: string;
  experience: string;
  about: string;
  available: boolean;
  fees: number;
  address: IDoctorAddress;
  date: number;
  slots_booked: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },
    address: { type: Object, required: true },
    date: { type: Number, required: true },
    slots_booked: { type: Object, default: {} },
  },
  { timestamps: true, minimize: false }
);

export const Doctor = mongoose.models.Doctor || mongoose.model<IDoctor>('Doctor', doctorSchema);
export default Doctor;
