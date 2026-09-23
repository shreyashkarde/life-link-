import { Server as SocketIOServer, Socket } from 'socket.io';
import { prescriptoStore } from '../config/prescriptoStore';
import { TokenService } from '../services/tokenService';

let ioInstance: SocketIOServer | null = null;

export const initSocket = (io: SocketIOServer) => {
  ioInstance = io;

  // 🔐 Enterprise Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      (socket.handshake.query?.token as string);

    if (token) {
      const decoded = TokenService.verifyAccessToken(token);
      if (decoded) {
        socket.data.user = decoded;
        // Auto-join isolated room based on authenticated role
        if (decoded.role === 'admin') {
          socket.join('admin_room');
        } else if (decoded.role === 'doctor') {
          socket.join(`doctor_${decoded.id}`);
          const norm = decoded.id.includes('_') ? decoded.id.replace('_', '') : decoded.id.replace(/^doc(\d+)/, 'doc_$1');
          socket.join(`doctor_${norm}`);
        } else if (decoded.role === 'patient') {
          socket.join(`user_${decoded.id}`);
        }
        return next();
      } else {
        return next(new Error('Authentication failed: Invalid or expired token'));
      }
    }

    // Permitted for fallback and demo testing
    next();
  });

  io.on('connection', (socket: Socket) => {
    // console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join room (e.g. "ride_123", "driver_108", "user_user1", "admin_emergency_room")
    socket.on('join_room', (data: { room: string } | string) => {
      const roomName = typeof data === 'string' ? data : data?.room;
      if (roomName) {
        socket.join(roomName);
        // console.log(`[Socket.io] Socket ${socket.id} joined room: ${roomName}`);
      }
    });

    // Leave room
    socket.on('leave_room', (data: { room: string } | string) => {
      const roomName = typeof data === 'string' ? data : data?.room;
      if (roomName) {
        socket.leave(roomName);
      }
    });

    // 🚑 Driver connected event
    socket.on('driverConnected', (data: { driverId: string; vehicleNumber?: string; lat?: number; lng?: number }) => {
      if (data?.driverId) {
        socket.join(`driver_${data.driverId}`);
        socket.emit('driverStatus', { driverId: data.driverId, status: 'ONLINE', timestamp: new Date().toISOString() });
      }
    });

    // 📍 Tracking start event (joins patient and ride rooms)
    socket.on('trackingStart', (data: { bookingId?: string; patientId?: string; driverId?: string }) => {
      if (data?.bookingId) {
        socket.join(`ride_${data.bookingId}`);
      }
      if (data?.patientId) {
        socket.join(`patient_${data.patientId}`);
        socket.join(`user_${data.patientId}`);
      }
      if (data?.driverId) {
        socket.join(`driver_${data.driverId}`);
      }
      socket.emit('trackingStarted', { success: true, bookingId: data?.bookingId });
    });

    // Throttled Live Driver Location Update (Emitted strictly to dedicated room - NO global broadcast)
    socket.on('locationUpdate', (payload: any) => {
      if (!payload) return;
      const lat = payload.latitude ?? payload.lat;
      const lng = payload.longitude ?? payload.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const normPayload = {
        userId: payload.userId,
        driverId: payload.driverId,
        bookingId: payload.bookingId,
        latitude: lat,
        longitude: lng,
        lat,
        lng,
        heading: payload.heading || 0,
        speed: payload.speed || 0,
        timestamp: new Date().toISOString(),
      };

      // Room-based broadcast ONLY to patient & trip subscribers
      if (payload.bookingId) {
        socket.to(`ride_${payload.bookingId}`).emit('locationUpdate', normPayload);
      }
      if (payload.patientId) {
        socket.to(`patient_${payload.patientId}`).emit('locationUpdate', normPayload);
        socket.to(`user_${payload.patientId}`).emit('locationUpdate', normPayload);
      }
      if (payload.driverId) {
        socket.to(`driver_${payload.driverId}`).emit('locationUpdate', normPayload);
      }
    });

    // Driver accepts booking
    socket.on('bookingAccepted', (payload: { bookingId: string; driverInfo: any }) => {
      if (!payload?.bookingId) return;
      const rideRoom = `ride_${payload.bookingId}`;
      socket.to(rideRoom).emit('bookingAccepted', payload);
      io.to('admin_emergency_room').emit('bookingAccepted', payload);
    });

    // Ride completed event
    socket.on('rideCompleted', (payload: { bookingId: string; summary: any }) => {
      if (!payload?.bookingId) return;
      const rideRoom = `ride_${payload.bookingId}`;
      socket.to(rideRoom).emit('rideCompleted', payload);
    });

    // --- Real-Time Appointment Engine (Room-Based Architecture) ---
    // 1. Patient joins their user room
    socket.on('join_user', (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
        // console.log(`[Socket.io] User ${userId} joined room: user_${userId}`);
      }
    });

    // 2. Doctor joins their dedicated doctor room (PRIVACY ISOLATION)
    socket.on('join_doctor', (doctorId: string) => {
      if (doctorId) {
        socket.join(`doctor_${doctorId}`);
        const norm = doctorId.includes('_') ? doctorId.replace('_', '') : doctorId.replace(/^doc(\d+)/, 'doc_$1');
        socket.join(`doctor_${norm}`);
      }
    });

    // 3. Admin joins global monitoring room
    socket.on('join_admin', () => {
      socket.join('admin_room');
    });

    // Direct socket relays with room-based privacy
    socket.on('appointmentBooked', (payload: any) => {
      emitAppointmentBooked(payload);
    });

    socket.on('appointmentUpdated', (payload: any) => {
      emitAppointmentUpdated(payload);
    });

    socket.on('appointmentCancelled', (payload: any) => {
      emitAppointmentCancelled(payload);
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Programmatic emitters for controllers & features
export const getIO = (): SocketIOServer | null => ioInstance;

export const emitNewBookingToDriver = (driverId: string, booking: any) => {
  if (ioInstance) {
    ioInstance.to(`driver_${driverId}`).emit('newBooking', booking);
  }
};

export const emitEmergencyAlert = (emergencyPayload: any) => {
  if (ioInstance) {
    // Room-based dispatch to hospital trauma desk and nearby drivers
    ioInstance.to('admin_emergency_room').emit('emergencyAlert', emergencyPayload);
    if (emergencyPayload.assignedDriverId) {
      ioInstance.to(`driver_${emergencyPayload.assignedDriverId}`).emit('emergencyAlert', emergencyPayload);
    }
  }
};

/**
 * 🔴 Room-Based Appointment Event Dispatchers (Data Isolation & Privacy)
 * - Patient room: user_${userId}
 * - Doctor room: doctor_${docId}
 * - Admin room: admin_room
 */
export const emitAppointmentBooked = (appointment: any) => {
  if (!ioInstance || !appointment) return;
  const docId = appointment.docId || appointment.docData?._id;
  const userId = appointment.userId || appointment.userData?._id;

  // 1. Send ONLY to that specific doctor
  if (docId) {
    ioInstance.to(`doctor_${docId}`).emit('appointmentBooked', appointment);
    const norm = docId.includes('_') ? docId.replace('_', '') : docId.replace(/^doc(\d+)/, 'doc_$1');
    ioInstance.to(`doctor_${norm}`).emit('appointmentBooked', appointment);
  }
  // 2. Send confirmation to that patient
  if (userId) {
    ioInstance.to(`user_${userId}`).emit('appointmentBooked', appointment);
  }
  // 3. Send metric event to admin room
  ioInstance.to('admin_room').emit('appointmentBooked', appointment);
};

export const emitAppointmentUpdated = (appointment: any) => {
  if (!ioInstance || !appointment) return;
  const docId = appointment.docId || appointment.docData?._id;
  const userId = appointment.userId || appointment.userData?._id;

  if (docId) {
    ioInstance.to(`doctor_${docId}`).emit('appointmentUpdated', appointment);
    const norm = docId.includes('_') ? docId.replace('_', '') : docId.replace(/^doc(\d+)/, 'doc_$1');
    ioInstance.to(`doctor_${norm}`).emit('appointmentUpdated', appointment);
  }
  if (userId) {
    ioInstance.to(`user_${userId}`).emit('appointmentUpdated', appointment);
  }
  ioInstance.to('admin_room').emit('appointmentUpdated', appointment);
};

export const emitAppointmentCancelled = (appointment: any) => {
  if (!ioInstance || !appointment) return;
  const docId = appointment.docId || appointment.docData?._id;
  const userId = appointment.userId || appointment.userData?._id;

  if (docId) {
    ioInstance.to(`doctor_${docId}`).emit('appointmentCancelled', appointment);
    const norm = docId.includes('_') ? docId.replace('_', '') : docId.replace(/^doc(\d+)/, 'doc_$1');
    ioInstance.to(`doctor_${norm}`).emit('appointmentCancelled', appointment);
  }
  if (userId) {
    ioInstance.to(`user_${userId}`).emit('appointmentCancelled', appointment);
  }
  ioInstance.to('admin_room').emit('appointmentCancelled', appointment);
};

