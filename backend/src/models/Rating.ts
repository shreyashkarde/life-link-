import mongoose, { Document, Schema } from 'mongoose';

export type RatingTargetType = 'DOCTOR' | 'DRIVER';

export interface IRating extends Document {
  reviewerId: mongoose.Types.ObjectId;
  targetType: RatingTargetType;
  targetId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  rating: number; // 1 to 5
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['DOCTOR', 'DRIVER'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'AmbulanceBooking' },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Rating = mongoose.model<IRating>('Rating', RatingSchema);
