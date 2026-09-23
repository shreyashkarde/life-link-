import mongoose, { Document, Schema } from 'mongoose';

export type RatingTarget = 'DOCTOR' | 'DRIVER';

export interface IRating extends Document {
  userId: string;
  userName: string;
  targetType: RatingTarget;
  targetId: string;
  rating: number; // 1 to 5
  review: string;
  createdAt: Date;
  updatedAt: Date;
}

const ratingSchema = new Schema<IRating>(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    targetType: {
      type: String,
      enum: ['DOCTOR', 'DRIVER'],
      required: true,
    },
    targetId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Rating = mongoose.models.Rating || mongoose.model<IRating>('Rating', ratingSchema);
export default Rating;
