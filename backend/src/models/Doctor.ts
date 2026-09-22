import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctorSlot {
  _id?: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "09:00")
  endTime: string; // HH:mm (e.g. "09:30")
  isBooked: boolean;
}

export interface IDoctor extends Document {
  userId: mongoose.Types.ObjectId;
  hospitalId?: mongoose.Types.ObjectId;
  specialization: string;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  bio?: string;
  availableSlots: IDoctorSlot[];
  averageRating: number;
  reviewCount: number;
  isAvailableToday: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSlotSchema = new Schema<IDoctorSlot>({
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
});

const DoctorSchema = new Schema<IDoctor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    specialization: { type: String, required: true, trim: true },
    qualifications: { type: String, required: true },
    experienceYears: { type: Number, default: 5 },
    consultationFee: { type: Number, default: 500 },
    bio: { type: String, default: '' },
    availableSlots: [DoctorSlotSchema],
    averageRating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    isAvailableToday: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Doctor = mongoose.model<IDoctor>('Doctor', DoctorSchema);
