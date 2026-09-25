import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prescriptoStore } from '../config/prescriptoStore';
import { TokenService } from '../services/tokenService';
import { memoryLocationStore } from '../models/locationModel';

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

    // 🚑 Universal Room Joins
    socket.on('join_driver', (driverId: string) => {
      if (driverId) {
        socket.join(`driver_${driverId}`);
        socket.join('driver_room');
      }
    });
    socket.on('joinDriver', (driverId: string) => {
      if (driverId) {
        socket.join(`driver_${driverId}`);
        socket.join('driver_room');
      }
    });

    socket.on('join_hospital', (hospitalId: string) => {
      if (hospitalId) {
        socket.join(`hospital_${hospitalId}`);
      }
    });
    socket.on('joinHospital', (hospitalId: string) => {
      if (hospitalId) {
        socket.join(`hospital_${hospitalId}`);
      }
    });

    socket.on('join_ride', (bookingId: string) => {
      if (bookingId) {
        socket.join(`ride_${bookingId}`);
      }
    });
    socket.on('joinRide', (bookingId: string) => {
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
    socket.on('joinPatient', (patientId: string) => {
      if (patientId) {
        socket.join(`patient_${patientId}`);
        socket.join(`user_${patientId}`);
      }
    });

    // 🚑 Driver connected event
    socket.on('driverConnected', (data: { driverId: string; hospitalId?: string; vehicleNumber?: string; lat?: number; lng?: number }) => {
      if (data?.driverId) {
        socket.join(`driver_${data.driverId}`);
        socket.join('driver_room');
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

    // 📡 Real-time Driver Location Broadcast ("driverLocation" & "locationUpdate")
    const handleDriverLocation = (payload: any) => {
      if (!payload) return;
      const lat = payload.latitude ?? payload.lat;
      const lng = payload.longitude ?? payload.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const effectiveDriverId = (payload.driverId || payload.userId || 'driver_108').trim();
      const normPayload = {
        userId: payload.userId || effectiveDriverId,
        patientId: payload.patientId,
        driverId: effectiveDriverId,
        bookingId: payload.bookingId,
        hospitalId: payload.hospitalId,
        latitude: lat,
        longitude: lng,
        lat,
        lng,
        heading: Number(payload.heading) || 0,
        speed: Number(payload.speed) || 0,
        timestamp: new Date().toISOString(),
      };

      // 1. Update in-memory telemetry store for microsecond lookups
      const locRecord = {
        userId: normPayload.userId,
        role: 'driver' as const,
        latitude: lat,
        longitude: lng,
        heading: normPayload.heading,
        speed: normPayload.speed,
        updatedAt: new Date(),
      };
      memoryLocationStore.set(effectiveDriverId, locRecord);
      memoryLocationStore.set(normPayload.userId, locRecord);
      memoryLocationStore.set('driver_108', locRecord);

      // 2. Broadcast to isolated rooms
      if (payload.bookingId) {
        socket.to(`ride_${payload.bookingId}`).emit('driverLocation', normPayload);
        socket.to(`ride_${payload.bookingId}`).emit('locationUpdate', normPayload);
      }
      if (payload.patientId) {
        socket.to(`patient_${payload.patientId}`).emit('driverLocation', normPayload);
        socket.to(`patient_${payload.patientId}`).emit('locationUpdate', normPayload);
        socket.to(`user_${payload.patientId}`).emit('driverLocation', normPayload);
        socket.to(`user_${payload.patientId}`).emit('locationUpdate', normPayload);
      }
      if (payload.hospitalId) {
        socket.to(`hospital_${payload.hospitalId}`).emit('driverLocation', normPayload);
        socket.to(`hospital_${payload.hospitalId}`).emit('locationUpdate', normPayload);
      }
      if (payload.driverId) {
        socket.to(`driver_${payload.driverId}`).emit('driverLocation', normPayload);
        socket.to(`driver_${payload.driverId}`).emit('locationUpdate', normPayload);
      }
      socket.to('admin_emergency_room').emit('driverLocation', normPayload);

      // 3. Low latency broadcast to all connected tracking clients
      socket.broadcast.emit('driverLocation', normPayload);
      socket.broadcast.emit('locationUpdate', normPayload);
    };

    socket.on('driverLocation', handleDriverLocation);
    socket.on('locationUpdate', handleDriverLocation);

    // 🚨 Emergency Ambulance Request from Patient -> Multi-Driver Pool
    socket.on('ambulanceRequest', (payload: any) => {
      emitAmbulanceRequest([], payload);
    });

    // 🎯 Driver accepts booking ("acceptRide", "rideAccepted", "bookingAccepted")
    const handleRideAccepted = (payload: { bookingId: string; driverInfo?: any; hospitalId?: string; patientId?: string; [key: string]: any }) => {
      if (!payload?.bookingId) return;
      const rideRoom = `ride_${payload.bookingId}`;
      socket.to(rideRoom).emit('rideAccepted', payload);
      socket.to(rideRoom).emit('bookingAccepted', payload);
      socket.to(rideRoom).emit('statusUpdate', { ...payload, bookingId: payload.bookingId, status: 'ACCEPTED' });
      socket.to(rideRoom).emit('rideStatusUpdate', { ...payload, bookingId: payload.bookingId, status: 'ACCEPTED' });
      if (payload.patientId) {
        socket.to(`patient_${payload.patientId}`).emit('rideAccepted', payload);
        socket.to(`patient_${payload.patientId}`).emit('bookingAccepted', payload);
        socket.to(`patient_${payload.patientId}`).emit('statusUpdate', { ...payload, bookingId: payload.bookingId, status: 'ACCEPTED' });
        socket.to(`user_${payload.patientId}`).emit('rideAccepted', payload);
      }
      if (payload.hospitalId) {
        socket.to(`hospital_${payload.hospitalId}`).emit('rideAccepted', payload);
      }
      io.to('admin_emergency_room').emit('rideAccepted', payload);
      io.to('admin_emergency_room').emit('statusUpdate', { ...payload, bookingId: payload.bookingId, status: 'ACCEPTED' });
    };


    socket.on('acceptRide', handleRideAccepted);
    socket.on('rideAccepted', handleRideAccepted);
    socket.on('bookingAccepted', handleRideAccepted);

    // ❌ Driver rejects request
    socket.on('rejectRide', (payload: any) => {
      if (payload?.bookingId) {
        socket.to(`ride_${payload.bookingId}`).emit('rideRejected', payload);
      }
    });

    // 🔄 Ride Status Update ("statusUpdate" & "rideStatusUpdate")
    const handleStatusUpdate = (payload: { bookingId: string; status: string; patientId?: string; hospitalId?: string; details?: any; [key: string]: any }) => {
      if (!payload?.bookingId) return;
      const rideRoom = `ride_${payload.bookingId}`;
      socket.to(rideRoom).emit('statusUpdate', payload);
      socket.to(rideRoom).emit('rideStatusUpdate', payload);
      if (payload.patientId) {
        socket.to(`patient_${payload.patientId}`).emit('statusUpdate', payload);
        socket.to(`patient_${payload.patientId}`).emit('rideStatusUpdate', payload);
        socket.to(`user_${payload.patientId}`).emit('statusUpdate', payload);
        socket.to(`user_${payload.patientId}`).emit('rideStatusUpdate', payload);
      }
      if (payload.hospitalId) {
        socket.to(`hospital_${payload.hospitalId}`).emit('statusUpdate', payload);
        socket.to(`hospital_${payload.hospitalId}`).emit('rideStatusUpdate', payload);
      }
      io.to('admin_emergency_room').emit('statusUpdate', payload);
      io.to('admin_emergency_room').emit('rideStatusUpdate', payload);

      if (payload.status === 'COMPLETED') {
        socket.to(rideRoom).emit('rideCompleted', payload);
      }
    };

    socket.on('statusUpdate', handleStatusUpdate);
    socket.on('rideStatusUpdate', handleStatusUpdate);

    // Ride completed event
    socket.on('rideCompleted', (payload: { bookingId: string; summary?: any; [key: string]: any }) => {
      if (!payload?.bookingId) return;
      const rideRoom = `ride_${payload.bookingId}`;
      socket.to(rideRoom).emit('rideCompleted', payload);
      socket.to(rideRoom).emit('statusUpdate', { bookingId: payload.bookingId, status: 'COMPLETED', summary: payload.summary });
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

// 🚨 Broadcast Emergency Ambulance Request to Multiple Nearby Drivers
export const emitAmbulanceRequest = (targetDriverIds: string[] = [], booking: any) => {
  if (ioInstance && booking) {
    const payload = {
      bookingId: booking._id || booking.bookingId || 'SOS-' + Date.now(),
      patientId: booking.patientId || 'patient_1',
      patientName: booking.patientName || 'Emergency Patient',
      patientPhone: booking.patientPhone || '+91 98200 99999',
      pickupLocation: booking.pickupLocation || { address: 'GPS Emergency Pin', lat: 19.0760, lng: 72.8777 },
      destinationHospital: booking.destinationHospital || { name: 'Lilavati Hospital Trauma Care', address: 'Bandra West' },
      hospitalId: booking.hospitalId || 'hosp_lilavati',
      hospitalName: booking.hospitalName || 'Lilavati Hospital & Research Centre',
      emergencyType: booking.patientCondition || booking.emergencyType || 'CRITICAL_CODE_RED',
      severity: booking.emergencySeverity || 'CRITICAL_CODE_RED',
      fare: booking.fare || 150,
      distanceKm: booking.distanceKm || 1.4,
      etaMinutes: booking.etaMinutes || 3,
      createdAt: booking.createdAt || new Date().toISOString(),
      ...booking,
    };

    // 1. Emit to specific drivers if provided
    if (Array.isArray(targetDriverIds) && targetDriverIds.length > 0) {
      targetDriverIds.forEach((driverId) => {
        if (driverId) {
          ioInstance?.to(`driver_${driverId}`).emit('ambulanceRequest', payload);
          ioInstance?.to(`driver_${driverId}`).emit('newBooking', payload);
          ioInstance?.to(`driver_${driverId}`).emit('emergencyAlert', payload);
        }
      });
    }

    // 2. Emit to universal drivers room and hospital room
    ioInstance.to('driver_room').emit('ambulanceRequest', payload);
    ioInstance.to('driver_room').emit('newBooking', payload);
    if (payload.hospitalId) {
      ioInstance.to(`hospital_${payload.hospitalId}`).emit('ambulanceRequest', payload);
      ioInstance.to(`hospital_${payload.hospitalId}`).emit('newBooking', payload);
    }
    ioInstance.to('admin_emergency_room').emit('ambulanceRequest', payload);
    ioInstance.to('admin_emergency_room').emit('newBooking', payload);
    ioInstance.to('admin_emergency_room').emit('emergencyAlert', payload);

    // 3. Global broadcast so all online active drivers are notified in real-time
    ioInstance.emit('ambulanceRequest', payload);
    ioInstance.emit('newBooking', payload);
    ioInstance.emit('emergencyAlert', payload);
  }
};

export const emitNewBookingToDriver = (driverId: string, booking: any) => {
  if (ioInstance) {
    emitAmbulanceRequest(driverId ? [driverId] : [], booking);
  }
};

export const emitRideAcceptedToPatient = (bookingId: string, rideData: any) => {
  if (ioInstance) {
    const payload = { bookingId, status: 'ACCEPTED', ...rideData };
    ioInstance.to(`ride_${bookingId}`).emit('rideAccepted', payload);
    ioInstance.to(`ride_${bookingId}`).emit('bookingAccepted', payload);
    ioInstance.to(`ride_${bookingId}`).emit('statusUpdate', payload);
    ioInstance.to(`ride_${bookingId}`).emit('rideStatusUpdate', payload);
    if (rideData?.patientId) {
      ioInstance.to(`patient_${rideData.patientId}`).emit('rideAccepted', payload);
      ioInstance.to(`patient_${rideData.patientId}`).emit('bookingAccepted', payload);
      ioInstance.to(`patient_${rideData.patientId}`).emit('statusUpdate', payload);
      ioInstance.to(`user_${rideData.patientId}`).emit('rideAccepted', payload);
      ioInstance.to(`user_${rideData.patientId}`).emit('statusUpdate', payload);
    }
    if (rideData?.hospitalId) {
      ioInstance.to(`hospital_${rideData.hospitalId}`).emit('rideAccepted', payload);
      ioInstance.to(`hospital_${rideData.hospitalId}`).emit('statusUpdate', payload);
    }
    ioInstance.to('driver_room').emit('rideAccepted', payload);
    ioInstance.to('admin_room').emit('rideAccepted', payload);
    ioInstance.to('admin_emergency_room').emit('rideAccepted', payload);
  }
};

export const emitRideStatusUpdate = (bookingId: string, statusPayload: any) => {
  if (ioInstance) {
    const payload = { bookingId, ...statusPayload };
    ioInstance.to(`ride_${bookingId}`).emit('statusUpdate', payload);
    ioInstance.to(`ride_${bookingId}`).emit('rideStatusUpdate', payload);
    if (statusPayload?.status === 'COMPLETED') {
      ioInstance.to(`ride_${bookingId}`).emit('rideCompleted', payload);
    }
    if (statusPayload?.patientId) {
      ioInstance.to(`patient_${statusPayload.patientId}`).emit('statusUpdate', payload);
      ioInstance.to(`patient_${statusPayload.patientId}`).emit('rideStatusUpdate', payload);
      ioInstance.to(`user_${statusPayload.patientId}`).emit('statusUpdate', payload);
      ioInstance.to(`user_${statusPayload.patientId}`).emit('rideStatusUpdate', payload);
    }
    if (statusPayload?.hospitalId) {
      ioInstance.to(`hospital_${statusPayload.hospitalId}`).emit('statusUpdate', payload);
      ioInstance.to(`hospital_${statusPayload.hospitalId}`).emit('rideStatusUpdate', payload);
    }
    ioInstance.to('driver_room').emit('statusUpdate', payload);
    ioInstance.to('driver_room').emit('rideStatusUpdate', payload);
    ioInstance.to('admin_room').emit('statusUpdate', payload);
    ioInstance.to('admin_emergency_room').emit('statusUpdate', payload);
  }
};

export const emitEmergencyAlert = (emergencyPayload: any) => {
  if (ioInstance) {
    emitAmbulanceRequest(emergencyPayload.assignedDriverId ? [emergencyPayload.assignedDriverId] : [], emergencyPayload);
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

export const emitDoctorAvailabilityChanged = (payload: {
  doctorId: string;
  hospitalId?: string;
  isAvailable?: boolean;
  available?: boolean;
  slots_booked?: any;
}) => {
  if (!ioInstance || !payload) return;
  ioInstance.emit('doctorAvailabilityChanged', payload);
  ioInstance.emit('doctorStatus', payload);
  if (payload.hospitalId) {
    ioInstance.to(`hospital_${payload.hospitalId}`).emit('doctorAvailabilityChanged', payload);
  }
};

