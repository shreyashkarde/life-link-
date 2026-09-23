import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 'BOOKING' | 'EMERGENCY' | 'APPOINTMENT' | 'SYSTEM';

export interface INotification extends Document {
  recipientId: string;
  recipientRole?: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: { type: String, required: true },
    recipientRole: { type: String, required: false },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['BOOKING', 'EMERGENCY', 'APPOINTMENT', 'SYSTEM'],
      default: 'SYSTEM',
    },
    metadata: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
