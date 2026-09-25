import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '../config/backendUrl';

export interface DriverLocationPayload {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  bookingId?: string;
  hospitalId?: string;
  driverId?: string;
  userId?: string;
  patientId?: string;
  heading?: number;
  speed?: number;
  timestamp?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private watchId: number | null = null;

  public connect(): Socket {
    if (!this.socket) {
      const token =
        sessionStorage.getItem('token') ||
        sessionStorage.getItem('aToken') ||
        sessionStorage.getItem('dToken') ||
        localStorage.getItem('token') ||
        '';

      this.socket = io(getBackendUrl(), {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        auth: { token },
      });

      this.socket.on('connect', () => {
        console.log(`📡 [Socket.io Client] Connected with ID: ${this.socket?.id}`);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`🔌 [Socket.io Client] Disconnected (${reason})`);
      });

      this.socket.on('connect_error', (err) => {
        console.warn(`⚠️ [Socket.io Client] Connection Error:`, err.message);
      });
    }
    return this.socket;
  }

  public getSocket(): Socket | null {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  // 🏢 Room-based subscriptions
  public joinRoom(room: string): void {
    const s = this.getSocket();
    if (s && room) {
      s.emit('join_room', { room });
    }
  }

  public leaveRoom(room: string): void {
    const s = this.getSocket();
    if (s && room) {
      s.emit('leave_room', { room });
    }
  }

  public joinDriver(driverId: string): void {
    const s = this.getSocket();
    if (s && driverId) {
      s.emit('join_driver', driverId);
      s.emit('join_room', { room: `driver_${driverId}` });
    }
  }

  public joinHospital(hospitalId: string): void {
    const s = this.getSocket();
    if (s && hospitalId) {
      s.emit('join_hospital', hospitalId);
      s.emit('join_room', { room: `hospital_${hospitalId}` });
    }
  }

  public joinRide(bookingId: string): void {
    const s = this.getSocket();
    if (s && bookingId) {
      s.emit('join_ride', bookingId);
      s.emit('join_room', { room: `ride_${bookingId}` });
    }
  }

  public joinPatient(patientId: string): void {
    const s = this.getSocket();
    if (s && patientId) {
      s.emit('join_patient', patientId);
      s.emit('join_room', { room: `patient_${patientId}` });
      s.emit('join_room', { room: `user_${patientId}` });
    }
  }

  public joinDoctor(doctorId: string): void {
    const s = this.getSocket();
    if (s && doctorId) {
      s.emit('join_doctor', doctorId);
      s.emit('join_room', { room: `doctor_${doctorId}` });
    }
  }

  public joinAdmin(): void {
    const s = this.getSocket();
    if (s) {
      s.emit('join_admin');
      s.emit('join_room', { room: 'admin_room' });
      s.emit('join_room', { room: 'admin_emergency_room' });
    }
  }

  // 🧹 Listen to Database Clear sync event
  public onDataCleared(callback: (data: any) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('dataCleared');
      const handler = (payload: any) => {
        console.log('🧹 [Socket.IO] Received dataCleared event. Synchronizing state...', payload);
        callback(payload);
      };
      s.on('dataCleared', handler);
      return () => {
        s.off('dataCleared', handler);
      };
    }
    return () => {};
  }

  // 📥 Listen to incoming doctor appointments
  public onNewAppointment(callback: (appointment: any) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('newAppointment');
      s.off('appointmentBooked');
      const handler = (data: any) => {
        console.log('🔔 [Socket.IO] Received newAppointment event:', data);
        callback(data);
      };
      s.on('newAppointment', handler);
      s.on('appointmentBooked', handler);
      return () => {
        s.off('newAppointment', handler);
        s.off('appointmentBooked', handler);
      };
    }
    return () => {};
  }

  // 🔄 Listen to appointment status updates
  public onAppointmentUpdated(callback: (appointment: any) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('appointmentUpdated');
      const handler = (data: any) => {
        console.log('🔄 [Socket.IO] Received appointmentUpdated event:', data);
        callback(data);
      };
      s.on('appointmentUpdated', handler);
      return () => {
        s.off('appointmentUpdated', handler);
      };
    }
    return () => {};
  }

  // ❌ Listen to appointment cancellations
  public onAppointmentCancelled(callback: (appointment: any) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('appointmentCancelled');
      const handler = (data: any) => {
        console.log('❌ [Socket.IO] Received appointmentCancelled event:', data);
        callback(data);
      };
      s.on('appointmentCancelled', handler);
      return () => {
        s.off('appointmentCancelled', handler);
      };
    }
    return () => {};
  }

  // 📍 Live Driver Location (Driver -> Socket Server -> Rooms)
  public emitDriverLocation(payload: DriverLocationPayload): void {
    const s = this.getSocket();
    if (s) {
      s.emit('driverLocation', payload);
      s.emit('locationUpdate', payload);
    }
  }

  // Alias for backward compatibility
  public sendLocationUpdate(payload: DriverLocationPayload): void {
    this.emitDriverLocation(payload);
  }

  // 📡 Listen to real-time driver location updates
  public onDriverLocation(callback: (data: DriverLocationPayload) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('driverLocation');
      s.off('locationUpdate');
      s.on('driverLocation', callback);
      s.on('locationUpdate', callback);
      return () => {
        s.off('driverLocation', callback);
        s.off('locationUpdate', callback);
      };
    }
    return () => {};
  }

  public onLocationUpdate(callback: (data: DriverLocationPayload) => void): () => void {
    return this.onDriverLocation(callback);
  }

  // 📥 Listen to incoming dispatch bookings for drivers
  public onNewBooking(callback: (booking: any) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('newBooking');
      const handler = (booking: any) => {
        console.log('🚑 [Socket.IO] Received newBooking event:', booking);
        callback(booking);
      };
      s.on('newBooking', handler);
      return () => {
        s.off('newBooking', handler);
      };
    }
    return () => {};
  }

  // 📥 Listen to ride accepted confirmation
  public onRideAccepted(callback: (data: any) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('rideAccepted');
      s.off('bookingAccepted');
      const handler = (data: any) => {
        console.log('✅ [Socket.IO] Received rideAccepted event:', data);
        callback(data);
      };
      s.on('rideAccepted', handler);
      s.on('bookingAccepted', handler);
      return () => {
        s.off('rideAccepted', handler);
        s.off('bookingAccepted', handler);
      };
    }
    return () => {};
  }

  public onBookingAccepted(callback: (data: any) => void): () => void {
    return this.onRideAccepted(callback);
  }

  // 📥 Listen to ride status lifecycle (ACCEPTED, EN_ROUTE_PICKUP, PATIENT_ONBOARD, COMPLETED, CANCELLED)
  public onRideStatusUpdate(callback: (data: { bookingId: string; status: string; booking?: any }) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('rideStatusUpdate');
      const handler = (data: any) => {
        console.log('🔄 [Socket.IO] Received rideStatusUpdate event:', data);
        callback(data);
      };
      s.on('rideStatusUpdate', handler);
      return () => {
        s.off('rideStatusUpdate', handler);
      };
    }
    return () => {};
  }

  public onEmergencyAlert(callback: (data: any) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('emergencyAlert');
      const handler = (data: any) => {
        console.log('🚨 [Socket.IO] Received emergencyAlert event:', data);
        callback(data);
      };
      s.on('emergencyAlert', handler);
      return () => {
        s.off('emergencyAlert', handler);
      };
    }
    return () => {};
  }

  public onRideCompleted(callback: (data: any) => void): () => void {
    const s = this.getSocket();
    if (s) {
      s.off('rideCompleted');
      const handler = (data: any) => {
        console.log('🏁 [Socket.IO] Received rideCompleted event:', data);
        callback(data);
      };
      s.on('rideCompleted', handler);
      return () => {
        s.off('rideCompleted', handler);
      };
    }
    return () => {};
  }

  /**
   * 📱 Start continuous browser Geolocation watchPosition stream
   */
  public startDriverGeolocationWatch(options: {
    bookingId?: string;
    hospitalId?: string;
    driverId?: string;
    onLocation?: (coords: { lat: number; lng: number; heading?: number; speed?: number }) => void;
  }): () => void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser environment');
      return () => {};
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        const payload: DriverLocationPayload = {
          lat: latitude,
          lng: longitude,
          latitude,
          longitude,
          bookingId: options.bookingId,
          hospitalId: options.hospitalId,
          driverId: options.driverId,
          heading: heading || 0,
          speed: speed || 0,
          timestamp: new Date().toISOString(),
        };

        this.emitDriverLocation(payload);

        if (options.onLocation) {
          options.onLocation({
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            speed: speed || 0,
          });
        }
      },
      (err) => {
        console.warn('[Driver Geolocation Watch Error]', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );

    return () => {
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
    };
  }

  public disconnect(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;
