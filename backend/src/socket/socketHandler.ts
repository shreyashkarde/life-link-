import { Server, Socket } from 'socket.io';
import { Ambulance } from '../models/Ambulance';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

export const setupSocketHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join patient/user room
    socket.on('join_user', (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket.io] Socket ${socket.id} joined user_${userId}`);
      }
    });

    // Join doctor room
    socket.on('join_doctor', (doctorId: string) => {
      if (doctorId) {
        socket.join(`doctor_${doctorId}`);
        socket.join('all_doctors');
        console.log(`[Socket.io] Doctor ${doctorId} joined doctor_${doctorId}`);
      }
    });

    // Join driver room and pool
    socket.on('join_driver', (driverId: string) => {
      if (driverId) {
        socket.join(`driver_${driverId}`);
        socket.join('online_drivers');
        console.log(`[Socket.io] Driver ${driverId} joined driver room and online_drivers pool`);
      }
    });

    // Join hospital admin room
    socket.on('join_hospital', (hospitalId?: string) => {
      socket.join('hospital_admins');
      if (hospitalId) {
        socket.join(`hospital_${hospitalId}`);
      }
      console.log(`[Socket.io] Socket ${socket.id} joined hospital_admins pool`);
    });

    // Join super admin room
    socket.on('join_admin', () => {
      socket.join('super_admins');
      console.log(`[Socket.io] Socket ${socket.id} joined super_admins global monitor`);
    });

    // Join specific booking tracking room
    socket.on('join_booking', (bookingId: string) => {
      if (bookingId) {
        socket.join(`booking_${bookingId}`);
        console.log(`[Socket.io] Socket ${socket.id} joined booking_${bookingId}`);
      }
    });

    // Driver sends live location update (real device GPS or simulation)
    socket.on('driver:locationUpdate', async (data: {
      driverId: string;
      bookingId?: string;
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
    }) => {
      const { driverId, bookingId, lat, lng, heading = 0, speed = 0 } = data;

      const locationPayload = {
        driverId,
        bookingId,
        lat,
        lng,
        heading,
        speed,
        timestamp: new Date().toISOString(),
      };

      // Emit to tracking room immediately for smooth 60fps UI tracking
      if (bookingId) {
        io.to(`booking_${bookingId}`).emit('booking:driverLocation', locationPayload);
      }

      // Also stream to hospital emergency rooms and super admin fleet overview
      io.to('hospital_admins').emit('fleet:driverLocation', locationPayload);
      io.to('super_admins').emit('fleet:driverLocation', locationPayload);

      // Persist coordinates (MongoDB or mockStore)
      try {
        if (isMongoConnected()) {
          await Ambulance.findOneAndUpdate(
            { driverId },
            {
              'currentLocation.lat': lat,
              'currentLocation.lng': lng,
              'currentLocation.heading': heading,
              'currentLocation.speed': speed,
              'currentLocation.lastUpdated': new Date(),
            }
          );

          if (bookingId) {
            await AmbulanceBooking.findByIdAndUpdate(bookingId, {
              driverLiveLocation: { lat, lng, heading, lastUpdated: new Date() },
            });
          }
        } else {
          // Update in-memory fallback
          const amb = memoryStore.ambulances.find(
            (a: any) => String(a.driverId) === String(driverId) || a.driverId?._id === driverId
          );
          if (amb) {
            amb.currentLocation = { lat, lng, heading, speed, lastUpdated: new Date() };
          }
          if (bookingId) {
            const b = memoryStore.bookings.find((item: any) => String(item._id) === String(bookingId));
            if (b) {
              b.driverLiveLocation = { lat, lng, heading, lastUpdated: new Date() };
            }
          }
        }
      } catch (err) {
        console.error('[Socket.io] Location update error:', err);
      }
    });

    // Patient sends booking request
    socket.on('booking:newRequest', (bookingData: any) => {
      console.log(`[Socket.io] 🚑 New Ambulance Booking Requested:`, bookingData._id || '');
      // Broadcast to online drivers pool and target driver if assigned
      if (bookingData.driverId) {
        io.to(`driver_${bookingData.driverId}`).emit('booking:incomingRequest', bookingData);
      }
      io.to('online_drivers').emit('booking:incomingRequest', bookingData);

      // Broadcast to hospital admin & super admin
      io.to('hospital_admins').emit('hospital:incomingAmbulance', bookingData);
      io.to('super_admins').emit('admin:eventLogged', {
        type: 'AMBULANCE_REQUESTED',
        booking: bookingData,
        timestamp: new Date().toISOString(),
      });
    });

    // Driver accepts booking
    socket.on('booking:driverAccepted', (data: { bookingId: string; driverId: string; patientId: string }) => {
      console.log(`[Socket.io] Driver accepted ride:`, data);
      io.to(`user_${data.patientId}`).emit('booking:acceptedNotification', data);
      io.to(`booking_${data.bookingId}`).emit('booking:statusChanged', {
        status: 'ACCEPTED',
        bookingId: data.bookingId,
        driverId: data.driverId,
      });

      io.to('super_admins').emit('admin:eventLogged', {
        type: 'RIDE_ACCEPTED',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Driver updates ride lifecycle status
    socket.on('booking:updateStatus', (data: { bookingId: string; status: string; patientId?: string }) => {
      console.log(`[Socket.io] Ride status update:`, data);
      io.to(`booking_${data.bookingId}`).emit('booking:statusChanged', data);
      if (data.patientId) {
        io.to(`user_${data.patientId}`).emit('booking:statusChanged', data);
      }
      io.to('hospital_admins').emit('hospital:rideStatusChanged', data);
      io.to('super_admins').emit('admin:eventLogged', {
        type: 'RIDE_STATUS_UPDATED',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Emergency 1-Click SOS Broadcast
    socket.on('emergency:sosTriggered', (sosData: any) => {
      console.log(`[Socket.io] 🚨 CODE RED: 1-CLICK SOS TRIGGERED!`, sosData._id || '');
      io.to('online_drivers').emit('emergency:highPriorityAlert', sosData);
      io.to('hospital_admins').emit('emergency:hospitalAlert', sosData);
      io.to('super_admins').emit('emergency:hospitalAlert', sosData);
      io.emit('emergency:codeRedBroadcast', {
        bookingId: sosData._id,
        pickupLocation: sosData.pickupLocation,
        timestamp: new Date().toISOString(),
      });
    });

    // Doctor appointment real-time events
    socket.on('appointment:new', (apptData: any) => {
      const docId = apptData.doctorId?._id || apptData.doctorId?.id || apptData.doctorId;
      console.log(`[Socket.io] 🩺 New Doctor Appointment booked for Doctor ${docId}:`, apptData._id);
      if (docId) {
        io.to(`doctor_${docId}`).emit('appointment:new', apptData);
      }
      io.to('super_admins').emit('admin:eventLogged', {
        type: 'APPOINTMENT_BOOKED',
        appointment: apptData,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('appointment:completed', (data: { appointmentId: string; patientId: string; doctorName: string }) => {
      console.log(`[Socket.io] 🩺 Doctor completed appointment:`, data);
      if (data.patientId) {
        io.to(`user_${data.patientId}`).emit('appointment:completedNotification', data);
      }
      io.to('super_admins').emit('admin:eventLogged', {
        type: 'APPOINTMENT_COMPLETED',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Hospital Bed update broadcast
    socket.on('hospital:bedUpdated', (bedData: any) => {
      console.log(`[Socket.io] 🏥 Hospital bed count updated:`, bedData);
      io.emit('hospital:bedSync', bedData);
      io.to('super_admins').emit('admin:eventLogged', {
        type: 'HOSPITAL_BEDS_UPDATED',
        bedData,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};
