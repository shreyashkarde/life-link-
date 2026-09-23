import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
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

  // Room-based subscriptions
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

  // Live Location Update (Driver -> Room)
  public sendLocationUpdate(payload: {
    bookingId: string;
    ambulanceId: string;
    lat: number;
    lng: number;
    heading?: number;
  }): void {
    const s = this.getSocket();
    if (s) {
      s.emit('locationUpdate', payload);
    }
  }

  public onLocationUpdate(callback: (data: { bookingId: string; lat: number; lng: number; heading?: number; timestamp: string }) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('locationUpdate'); // Remove existing listener to prevent duplicate handlers
      s.on('locationUpdate', callback);
    }
  }

  public onEmergencyAlert(callback: (data: any) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('emergencyAlert');
      s.on('emergencyAlert', callback);
    }
  }

  public onBookingAccepted(callback: (data: any) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('bookingAccepted');
      s.on('bookingAccepted', callback);
    }
  }

  public onRideCompleted(callback: (data: any) => void): void {
    const s = this.getSocket();
    if (s) {
      s.off('rideCompleted');
      s.on('rideCompleted', callback);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;
