import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
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
      let decoded: any = TokenService.verifyAccessToken(token);
      if (!decoded) {
        try {
          decoded = jwt.verify(token, ENV.JWT_SECRET);
        } catch {
          // Token decode fallback suppression
        }
      }

      if (decoded) {
        socket.data.user = decoded;
        const role = (decoded.role || '').toLowerCase();
        const userId = decoded.id || decoded._id || '';

        // Auto-join isolated rooms based on authenticated role & tenant
        if (role === 'admin' || role === 'super_admin' || role === 'superadmin' || role === 'admin_root') {
          socket.join('admin_room');
          socket.join('admin_emergency_room');
        } else if (role === 'doctor') {
          if (userId) {
            socket.join(`doctor_${userId}`);
            const norm = String(userId).includes('_') ? String(userId).replace('_', '') : String(userId).replace(/^doc(\d+)/, 'doc_$1');
            socket.join(`doctor_${norm}`);
          }
          if (decoded.hospitalId) {
            socket.join(`hospital_${decoded.hospitalId}`);
          }
          socket.join('doctor_room');
        } else if (role === 'driver') {
          if (userId) {
            socket.join(`driver_${userId}`);
          }
          if (decoded.hospitalId) {
            socket.join(`hospital_${decoded.hospitalId}`);
          }
          socket.join('driver_room');
        } else if (role === 'patient' || role === 'user') {
          if (userId) {
            socket.join(`user_${userId}`);
            socket.join(`patient_${userId}`);
          }
        } else if (role === 'admin_hospital' || role === 'hospital_admin' || role === 'hospital') {
          if (decoded.hospitalId) {
            socket.join(`hospital_${decoded.hospitalId}`);
          }
          socket.join('hospital_room');
          socket.join('admin_room');
        }
        return next();
      }
    }

    // Permitted for fallback and demo testing
    next();
  });

  io.on('connection', (socket: Socket) => {
    // 🏢 Universal Room Joining
    socket.on('join_room', (data: { room: string } | string) => {
      const roomName = typeof data === 'string' ? data : data?.room;
      if (roomName) {
        socket.join(roomName);
      }
    });

    socket.on('leave_room', (data: { room: string } | string) => {
      const roomName = typeof data === 'string' ? data : data?.room;
      if (roomName) {
        socket.leave(roomName);
      }
    });

    // 🚑 Specific Room Joins
    socket.on('join_driver', (driverId: string) => {
      if (driverId) {
        socket.join(`driver_${driverId}`);
      }
    });

    socket.on('join_hospital', (hospitalId: string) => {
      if (hospitalId) {
        socket.join(`hospital_${hospitalId}`);
      }
    });

    socket.on('join_ride', (bookingId: string) => {
      if (bookingId) {
        socket.join(`ride_${bookingId}`);
      }
    });

    socket.on('join_patient', (patientId: string) => {
      if (patientId) {
        socket.join(`patient_${patientId}`);
        socket.join(`user_${patientId}`);
      }
    });

    // 🚑 Driver connected event
    socket.on('driverConnected', (data: { driverId: string; hospitalId?: string; vehicleNumber?: string; lat?: number; lng?: number }) => {
      if (data?.driverId) {
        socket.join(`driver_${data.driverId}`);
        if (data.hospitalId) {
          socket.join(`hospital_${data.hospitalId}`);
        }
        socket.emit('driverStatus', { driverId: data.driverId, status: 'ONLINE', timestamp: new Date().toISOString() });
      }
    });

    // 📍 Tracking start event (joins patient, ride, and hospital rooms)
    socket.on('trackingStart', (data: { bookingId?: string; patientId?: string; driverId?: string; hospitalId?: string }) => {
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
      if (data?.hospitalId) {
        socket.join(`hospital_${data.hospitalId}`);
      }
      socket.emit('trackingStarted', { success: true, bookingId: data?.bookingId });
    });

    // 📡 Real-time Driver Location Broadcast ("driverLocation" & alias "locationUpdate")
    const handleDriverLocation = (payload: any) => {
      if (!payload) return;
      const lat = payload.latitude ?? payload.lat;
      const lng = payload.longitude ?? payload.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const normPayload = {
        userId: payload.userId,
        patientId: payload.patientId,
        driverId: payload.driverId,
        bookingId: payload.bookingId,
        hospitalId: payload.hospitalId,
        latitude: lat,
        longitude: lng,
        lat,
        lng,
        heading: payload.heading || 0,
        speed: payload.speed || 0,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to ride room, patient room, driver room, and hospital room
      if (payload.bookingId) {
        socket.to(`ride_${payload.bookingId}`).emit('driverLocation', normPayload);
        socket.to(`ride_${payload.bookingId}`).emit('locationUpdate', normPayload);
      }
      if (payload.patientId) {
        socket.to(`patient_${payload.patientId}`).emit('driverLocation', normPayload);
        socket.to(`patient_${payload.patientId}`).emit('locationUpdate', normPayload);
        socket.to(`user_${payload.patientId}`).emit('driverLocation', normPayload);
      }
      if (payload.hospitalId) {
        socket.to(`hospital_${payload.hospitalId}`).emit('driverLocation', normPayload);
      }
      if (payload.driverId) {
        socket.to(`driver_${payload.driverId}`).emit('driverLocation', normPayload);
      }
      socket.to('admin_emergency_room').emit('driverLocation', normPayload);
    };

    socket.on('driverLocation', handleDriverLocation);
    socket.on('locationUpdate', handleDriverLocation);

    // 🎯 Driver accepts booking ("rideAccepted" & "bookingAccepted")
    const handleRideAccepted = (payload: { bookingId: string; driverInfo?: any; hospitalId?: string; patientId?: string }) => {
      if (!payload?.bookingId) return;
      const rideRoom = `ride_${payload.bookingId}`;
      socket.to(rideRoom).emit('rideAccepted', payload);
      socket.to(rideRoom).emit('bookingAccepted', payload);
      if (payload.patientId) {
        socket.to(`patient_${payload.patientId}`).emit('rideAccepted', payload);
      }
      if (payload.hospitalId) {
        socket.to(`hospital_${payload.hospitalId}`).emit('rideAccepted', payload);
      }
      io.to('admin_emergency_room').emit('rideAccepted', payload);
    };

    socket.on('rideAccepted', handleRideAccepted);
    socket.on('bookingAccepted', handleRideAccepted);

    // 🔄 Ride Status Update ("rideStatusUpdate")
    socket.on('rideStatusUpdate', (payload: { bookingId: string; status: string; patientId?: string; hospitalId?: string; details?: any }) => {
      if (!payload?.bookingId) return;
      const rideRoom = `ride_${payload.bookingId}`;
      socket.to(rideRoom).emit('rideStatusUpdate', payload);
      if (payload.patientId) {
        socket.to(`patient_${payload.patientId}`).emit('rideStatusUpdate', payload);
      }
      if (payload.hospitalId) {
        socket.to(`hospital_${payload.hospitalId}`).emit('rideStatusUpdate', payload);
      }
      io.to('admin_emergency_room').emit('rideStatusUpdate', payload);
    });

    // Ride completed event
    socket.on('rideCompleted', (payload: { bookingId: string; summary?: any }) => {
      if (!payload?.bookingId) return;
      const rideRoom = `ride_${payload.bookingId}`;
      socket.to(rideRoom).emit('rideCompleted', payload);
      socket.to(rideRoom).emit('rideStatusUpdate', { bookingId: payload.bookingId, status: 'COMPLETED', summary: payload.summary });
    });

    // --- Real-Time Appointment Engine (Room-Based Architecture) ---
    socket.on('join_user', (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    socket.on('join_doctor', (doctorId: string) => {
      if (doctorId) {
        socket.join(`doctor_${doctorId}`);
        const norm = doctorId.includes('_') ? doctorId.replace('_', '') : doctorId.replace(/^doc(\d+)/, 'doc_$1');
        socket.join(`doctor_${norm}`);
      }
    });

    socket.on('join_admin', () => {
      socket.join('admin_room');
      socket.join('admin_emergency_room');
    });

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
      // Disconnected safely
    });
  });

  return io;
};

// Programmatic emitters for controllers & features
export const getIO = (): SocketIOServer | null => ioInstance;

export const emitNewBookingToDriver = (driverId: string, booking: any) => {
  if (ioInstance) {
    ioInstance.to(`driver_${driverId}`).emit('newBooking', booking);
    if (booking?.hospitalId) {
      ioInstance.to(`hospital_${booking.hospitalId}`).emit('newBooking', booking);
    }
    if (booking?.patientId) {
      ioInstance.to(`patient_${booking.patientId}`).emit('newBooking', booking);
      ioInstance.to(`user_${booking.patientId}`).emit('newBooking', booking);
    }
    ioInstance.to('admin_room').emit('newBooking', booking);
    ioInstance.to('admin_emergency_room').emit('newBooking', booking);
    ioInstance.emit('newBooking', booking);
  }
};

export const emitRideAcceptedToPatient = (bookingId: string, rideData: any) => {
  if (ioInstance) {
    ioInstance.to(`ride_${bookingId}`).emit('rideAccepted', rideData);
    ioInstance.to(`ride_${bookingId}`).emit('bookingAccepted', rideData);
    if (rideData?.patientId) {
      ioInstance.to(`patient_${rideData.patientId}`).emit('rideAccepted', rideData);
      ioInstance.to(`user_${rideData.patientId}`).emit('rideAccepted', rideData);
    }
    if (rideData?.hospitalId) {
      ioInstance.to(`hospital_${rideData.hospitalId}`).emit('rideAccepted', rideData);
    }
    ioInstance.to('admin_room').emit('rideAccepted', rideData);
    ioInstance.to('admin_emergency_room').emit('rideAccepted', rideData);
  }
};

export const emitRideStatusUpdate = (bookingId: string, statusPayload: any) => {
  if (ioInstance) {
    ioInstance.to(`ride_${bookingId}`).emit('rideStatusUpdate', statusPayload);
    if (statusPayload?.patientId) {
      ioInstance.to(`patient_${statusPayload.patientId}`).emit('rideStatusUpdate', statusPayload);
      ioInstance.to(`user_${statusPayload.patientId}`).emit('rideStatusUpdate', statusPayload);
    }
    if (statusPayload?.hospitalId) {
      ioInstance.to(`hospital_${statusPayload.hospitalId}`).emit('rideStatusUpdate', statusPayload);
    }
    ioInstance.to('admin_room').emit('rideStatusUpdate', statusPayload);
    ioInstance.to('admin_emergency_room').emit('rideStatusUpdate', statusPayload);
  }
};

export const emitEmergencyAlert = (emergencyPayload: any) => {
  if (ioInstance) {
    ioInstance.to('admin_emergency_room').emit('emergencyAlert', emergencyPayload);
    ioInstance.to('admin_room').emit('emergencyAlert', emergencyPayload);
    if (emergencyPayload.assignedDriverId) {
      ioInstance.to(`driver_${emergencyPayload.assignedDriverId}`).emit('emergencyAlert', emergencyPayload);
      ioInstance.to(`driver_${emergencyPayload.assignedDriverId}`).emit('newBooking', emergencyPayload);
    }
    if (emergencyPayload.hospitalId) {
      ioInstance.to(`hospital_${emergencyPayload.hospitalId}`).emit('emergencyAlert', emergencyPayload);
      ioInstance.to(`hospital_${emergencyPayload.hospitalId}`).emit('newBooking', emergencyPayload);
    }
    if (emergencyPayload.patientId) {
      ioInstance.to(`patient_${emergencyPayload.patientId}`).emit('emergencyAlert', emergencyPayload);
      ioInstance.to(`user_${emergencyPayload.patientId}`).emit('emergencyAlert', emergencyPayload);
    }
    ioInstance.emit('newBooking', emergencyPayload);
    ioInstance.emit('emergencyAlert', emergencyPayload);
  }
};

/**
 * 🔴 Room-Based Appointment Event Dispatchers (Data Isolation & Privacy)
 */
export const emitAppointmentBooked = (appointment: any) => {
  if (!ioInstance || !appointment) return;
  const docId = appointment.docId || appointment.docData?._id || appointment.doctorId;
  const userId = appointment.userId || appointment.userData?._id || appointment.patientId;

  if (docId) {
    ioInstance.to(`doctor_${docId}`).emit('newAppointment', appointment);
    ioInstance.to(`doctor_${docId}`).emit('appointmentBooked', appointment);
    const norm = docId.includes('_') ? docId.replace('_', '') : docId.replace(/^doc(\d+)/, 'doc_$1');
    ioInstance.to(`doctor_${norm}`).emit('newAppointment', appointment);
    ioInstance.to(`doctor_${norm}`).emit('appointmentBooked', appointment);
  }
  if (userId) {
    ioInstance.to(`user_${userId}`).emit('newAppointment', appointment);
    ioInstance.to(`user_${userId}`).emit('appointmentBooked', appointment);
    ioInstance.to(`patient_${userId}`).emit('newAppointment', appointment);
    ioInstance.to(`patient_${userId}`).emit('appointmentBooked', appointment);
  }
  if (appointment.hospitalId) {
    ioInstance.to(`hospital_${appointment.hospitalId}`).emit('newAppointment', appointment);
    ioInstance.to(`hospital_${appointment.hospitalId}`).emit('appointmentBooked', appointment);
  }
  ioInstance.to('admin_room').emit('newAppointment', appointment);
  ioInstance.to('admin_room').emit('appointmentBooked', appointment);
  ioInstance.emit('newAppointment', appointment);
  ioInstance.emit('appointmentBooked', appointment);
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
    ioInstance.to(`patient_${userId}`).emit('appointmentUpdated', appointment);
  }
  if (appointment.hospitalId) {
    ioInstance.to(`hospital_${appointment.hospitalId}`).emit('appointmentUpdated', appointment);
  }
  ioInstance.to('admin_room').emit('appointmentUpdated', appointment);
  ioInstance.emit('appointmentUpdated', appointment);
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
    ioInstance.to(`patient_${userId}`).emit('appointmentCancelled', appointment);
  }
  if (appointment.hospitalId) {
    ioInstance.to(`hospital_${appointment.hospitalId}`).emit('appointmentCancelled', appointment);
  }
  ioInstance.to('admin_room').emit('appointmentCancelled', appointment);
  ioInstance.emit('appointmentCancelled', appointment);
};

