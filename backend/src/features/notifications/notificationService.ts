import { EventEmitter } from 'events';
import { getIO } from '../../socket/socketHandler';

export interface AppNotification {
  id: string;
  type: 'AMBULANCE_BOOKED' | 'STATUS_UPDATED' | 'EMERGENCY_ALERT' | 'SYSTEM_INFO';
  title: string;
  message: string;
  targetRole?: 'ALL' | 'PATIENT' | 'DRIVER' | 'ADMIN';
  targetId?: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

class NotificationEmitter extends EventEmitter {}

export const notificationEvents = new NotificationEmitter();

// In-memory sliding buffer of the last 100 notifications
const notificationsBuffer: AppNotification[] = [
  {
    id: 'notif_init_1',
    type: 'SYSTEM_INFO',
    title: 'Emergency Dispatch Active',
    message: 'All 5 City Ambulance Units are standing by for priority dispatch.',
    targetRole: 'ALL',
    timestamp: new Date().toISOString(),
    read: false,
  },
];

export class NotificationService {
  /**
   * Broadcast a notification across event bus and real-time socket
   */
  static sendNotification(payload: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
    const notif: AppNotification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      timestamp: new Date().toISOString(),
      read: false,
    };

    notificationsBuffer.unshift(notif);
    if (notificationsBuffer.length > 100) {
      notificationsBuffer.pop();
    }

    // Emit on internal event emitter
    notificationEvents.emit('notification', notif);

    // Emit to real-time WebSockets if socket instance is available
    const io = getIO();
    if (io) {
      if (notif.targetId) {
        io.to(`user_${notif.targetId}`).emit('notification', notif);
      } else if (notif.targetRole && notif.targetRole !== 'ALL') {
        io.to(`role_${notif.targetRole.toLowerCase()}`).emit('notification', notif);
      } else {
        io.emit('notification', notif);
      }
    }

    return notif;
  }

  /**
   * Trigger on Ambulance Booking
   */
  static notifyBookingCreated(booking: any) {
    return this.sendNotification({
      type: 'AMBULANCE_BOOKED',
      title: '🚑 Ambulance Dispatched!',
      message: `Unit ${booking.vehicleNumber || '108'} has been assigned to ${booking.patientName || 'Patient'}. Driver: ${booking.driverName || 'Rajesh Kumar'}.`,
      targetRole: 'ALL',
      data: { bookingId: booking._id, status: booking.status },
    });
  }

  /**
   * Trigger on Status Update
   */
  static notifyStatusUpdated(bookingId: string, newStatus: string, driverName?: string) {
    const statusTitles: Record<string, string> = {
      EN_ROUTE_PICKUP: '🚗 Ambulance is on the way!',
      PATIENT_ONBOARD: '🏥 Patient on board, heading to Trauma Care!',
      COMPLETED: '✅ Ambulance trip completed safely.',
      CANCELLED: '⚠️ Ambulance booking cancelled.',
    };

    return this.sendNotification({
      type: 'STATUS_UPDATED',
      title: statusTitles[newStatus] || `Trip Status: ${newStatus}`,
      message: `Booking #${bookingId.substring(bookingId.length - 6)} updated to ${newStatus}. Driver: ${driverName || 'Rajesh Kumar'}.`,
      targetRole: 'ALL',
      data: { bookingId, status: newStatus },
    });
  }

  /**
   * Get all stored notifications
   */
  static getRecentNotifications(limit = 20): AppNotification[] {
    return notificationsBuffer.slice(0, limit);
  }
}
