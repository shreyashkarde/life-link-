import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  userId: string;
  patientId?: string;
  docId: string;
  doctorId?: string;
  hospitalId?: string;
  hospitalName?: string;
  slotDate: string;
  slotTime: string;
  userData: any;
  docData: any;
  amount: number;
  date: number;
  cancelled: boolean;
  payment: boolean;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    userId: { type: String, required: true, index: true },
    patientId: { type: String, required: false, index: true },
    docId: { type: String, required: true, index: true },
    doctorId: { type: String, required: false, index: true },
    hospitalId: { type: String, default: 'hosp_lilavati', ref: 'Hospital', index: true },
    hospitalName: { type: String, default: 'Lilavati Hospital & Research Centre' },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

appointmentSchema.index({ hospitalId: 1, docId: 1 });
appointmentSchema.index({ hospitalId: 1, slotDate: 1 });
appointmentSchema.index({ hospitalId: 1, isCompleted: 1 });

export const Appointment =
  mongoose.models.Appointment ||
  mongoose.model<IAppointment>('Appointment', appointmentSchema);
export default Appointment;
