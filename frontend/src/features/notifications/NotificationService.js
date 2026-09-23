/**
 * 🔔 NotificationService.js
 * Client-Side Notification Event Bus
 * Triggers instant alerts on ambulance bookings and trip status changes.
 */

class NotificationServiceManager {
  constructor() {
    this.listeners = new Set();
    this.notifications = [];
  }

  // Subscribe a component to live notifications
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Dispatch an alert across all active listeners
  notify(notification) {
    const payload = {
      id: 'notif_' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      read: false,
      ...notification,
    };

    this.notifications.unshift(payload);
    if (this.notifications.length > 50) this.notifications.pop();

    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('Notification listener error:', err);
      }
    });

    return payload;
  }

  // Trigger when Ambulance is Booked
  notifyAmbulanceBooked(booking) {
    return this.notify({
      type: 'AMBULANCE_BOOKED',
      title: '🚑 Ambulance Dispatched!',
      message: `Unit ${booking.vehicleNumber || '108'} is assigned. Driver: ${booking.driverName || 'Rajesh Kumar'}.`,
    });
  }

  // Trigger when Status is Updated
  notifyStatusUpdated(bookingId, status, driverName = 'Rajesh Kumar') {
    const statusMessages = {
      EN_ROUTE_PICKUP: `Driver ${driverName} is on the way to your GPS location.`,
      PATIENT_ONBOARD: `Patient picked up. Ambulance en route to emergency trauma ward.`,
      COMPLETED: `Trip completed safely at hospital trauma entrance.`,
      CANCELLED: `Ambulance dispatch cancelled.`,
    };

    return this.notify({
      type: 'STATUS_UPDATED',
      title: `Trip Status: ${status}`,
      message: statusMessages[status] || `Trip #${bookingId.slice(-5)} status changed to ${status}.`,
    });
  }

  // Trigger when Doctor Appointment is Booked
  notifyAppointmentBooked(appointment) {
    const docName = appointment.docData?.name || appointment.doctorName || 'Doctor';
    const time = `${appointment.slotDate || 'Date'} at ${appointment.slotTime || 'Time'}`;
    return this.notify({
      type: 'APPOINTMENT_BOOKED',
      title: '📅 Appointment Scheduled!',
      message: `Consultation confirmed with ${docName} on ${time}.`,
    });
  }

  // Trigger when Doctor Accepts Appointment
  notifyDoctorAccepted(appointment) {
    const docName = appointment.docData?.name || appointment.doctorName || 'Doctor';
    return this.notify({
      type: 'APPOINTMENT_ACCEPTED',
      title: '✅ Doctor Confirmed!',
      message: `${docName} has accepted your consultation request.`,
    });
  }

  // Trigger when Appointment Status Changes
  notifyAppointmentUpdated(appointment, status) {
    const statusText = status || appointment.status || 'UPDATED';
    return this.notify({
      type: 'APPOINTMENT_UPDATED',
      title: `Consultation Status: ${statusText}`,
      message: `Your appointment is now marked as ${statusText}.`,
    });
  }

  // Trigger when Appointment is Cancelled
  notifyAppointmentCancelled(appointment) {
    return this.notify({
      type: 'APPOINTMENT_CANCELLED',
      title: '❌ Appointment Cancelled',
      message: `Appointment for ${appointment.slotDate || 'scheduled slot'} has been cancelled.`,
    });
  }

  getHistory() {
    return this.notifications;
  }
}

export const NotificationService = new NotificationServiceManager();
export default NotificationService;
