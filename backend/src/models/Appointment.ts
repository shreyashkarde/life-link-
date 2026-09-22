import mongoose, { Document, Schema } from 'mongoose';

export type AppointmentStatus = 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  hospitalId?: mongoose.Types.ObjectId;
  slotDate: string; // YYYY-MM-DD
  slotTime: string; // HH:mm
  status: AppointmentStatus;
  symptoms?: string;
  notes?: string;
  prescription?: string;
  consultationFee: number;
  paymentStatus: 'PENDING' | 'PAID';
  isEmergency: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['BOOKED', 'COMPLETED', 'CANCELLED', 'REJECTED'],
      default: 'BOOKED',
    },
    symptoms: { type: String, default: '' },
    notes: { type: String, default: '' },
    prescription: { type: String, default: '' },
    consultationFee: { type: Number, required: true, default: 500 },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PAID',
    },
    isEmergency: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
