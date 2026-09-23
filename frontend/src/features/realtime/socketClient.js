import { io } from 'socket.io-client';

/**
 * 🔴 socketClient.js
 * Centralized Room-Based Socket.io Client for Real-Time Prescripto Engine
 * Handles user, doctor, and admin room isolation with automatic reconnection.
 */
class RealtimeSocketClient {
  constructor() {
    this.socket = null;
    this.serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    this.listeners = new Map();
    this.activeRooms = new Set();
    this.isConnected = false;

    this.init();
  }

  init() {
    if (this.socket) return this.socket;

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      // Rejoin rooms on reconnection
      this.activeRooms.forEach((room) => {
        this.socket.emit('join_room', room);
      });
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) this.init();
    return this.socket;
  }

  // --- Room Architecture (Data Isolation & Privacy) ---
  joinUserRoom(userId) {
    if (!userId) return;
    const room = `user_${userId}`;
    this.activeRooms.add(room);
    const sock = this.getSocket();
    sock.emit('join_user', userId);
    sock.emit('join_room', room);
  }

  joinDoctorRoom(doctorId) {
    if (!doctorId) return;
    const room = `doctor_${doctorId}`;
    this.activeRooms.add(room);
    const sock = this.getSocket();
    sock.emit('join_doctor', doctorId);
    sock.emit('join_room', room);
  }

  joinAdminRoom() {
    const room = 'admin_room';
    this.activeRooms.add(room);
    const sock = this.getSocket();
    sock.emit('join_admin');
    sock.emit('join_room', room);
  }

  joinRoom(roomName) {
    if (!roomName) return;
    this.activeRooms.add(roomName);
    const sock = this.getSocket();
    sock.emit('join_room', roomName);
  }

  leaveRoom(roomName) {
    this.activeRooms.delete(roomName);
    if (this.socket) {
      this.socket.emit('leave_room', roomName);
    }
  }

  // --- Event Listeners for Appointments ---
  onAppointmentBooked(callback) {
    const sock = this.getSocket();
    sock.on('appointmentBooked', callback);
    return () => sock.off('appointmentBooked', callback);
  }

  onAppointmentUpdated(callback) {
    const sock = this.getSocket();
    sock.on('appointmentUpdated', callback);
    return () => sock.off('appointmentUpdated', callback);
  }

  onAppointmentCancelled(callback) {
    const sock = this.getSocket();
    sock.on('appointmentCancelled', callback);
    return () => sock.off('appointmentCancelled', callback);
  }

  // Generic helpers
  on(event, callback) {
    const sock = this.getSocket();
    sock.on(event, callback);
    return () => sock.off(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    const sock = this.getSocket();
    sock.emit(event, data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketClient = new RealtimeSocketClient();
export default socketClient;
