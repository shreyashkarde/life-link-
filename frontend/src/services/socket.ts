import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

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
      this.socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        // console.log(`[Socket Client] Connected with ID: ${this.socket?.id}`);
      });

      this.socket.on('disconnect', () => {
        // console.log('[Socket Client] Disconnected');
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
  public onDriverLocation(callback: (data: DriverLocationPayload) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('driverLocation');
      s.off('locationUpdate');
      s.on('driverLocation', callback);
      s.on('locationUpdate', callback);
    }
  }

  public onLocationUpdate(callback: (data: DriverLocationPayload) => void): void {
    this.onDriverLocation(callback);
  }

  // 📥 Listen to incoming dispatch bookings for drivers
  public onNewBooking(callback: (booking: any) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('newBooking');
      s.on('newBooking', callback);
    }
  }

  // 📥 Listen to ride accepted confirmation
  public onRideAccepted(callback: (data: any) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('rideAccepted');
      s.off('bookingAccepted');
      s.on('rideAccepted', callback);
      s.on('bookingAccepted', callback);
    }
  }

  public onBookingAccepted(callback: (data: any) => void): void {
    this.onRideAccepted(callback);
  }

  // 📥 Listen to ride status lifecycle (ACCEPTED, EN_ROUTE_PICKUP, PATIENT_ONBOARD, COMPLETED, CANCELLED)
  public onRideStatusUpdate(callback: (data: { bookingId: string; status: string; booking?: any }) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('rideStatusUpdate');
      s.on('rideStatusUpdate', callback);
    }
  }

  public onEmergencyAlert(callback: (data: any) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('emergencyAlert');
      s.on('emergencyAlert', callback);
    }
  }

  public onRideCompleted(callback: (data: any) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('rideCompleted');
      s.on('rideCompleted', callback);
    }
  }

  /**
   * 📱 Start continuous browser Geolocation watchPosition stream
   * Continuous high-accuracy GPS emitter for drivers
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

        // Broadcast to socket
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

