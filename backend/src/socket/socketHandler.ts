import { Server, Socket } from 'socket.io';
import { Ambulance } from '../models/Ambulance';
import { AmbulanceBooking } from '../models/AmbulanceBooking';

export const setupSocketHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join user-specific room
    socket.on('join_user', (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket.io] Socket ${socket.id} joined user_${userId}`);
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

    // Join specific booking tracking room
    socket.on('join_booking', (bookingId: string) => {
      if (bookingId) {
        socket.join(`booking_${bookingId}`);
        console.log(`[Socket.io] Socket ${socket.id} joined booking_${bookingId}`);
      }
    });

    // Driver sends live location update (every 3-5 seconds)
    socket.on('driver:locationUpdate', async (data: {
      driverId: string;
      bookingId?: string;
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
    }) => {
      const { driverId, bookingId, lat, lng, heading = 0, speed = 0 } = data;

      try {
        // Emit to tracking room immediately for smooth UI animation
        if (bookingId) {
          io.to(`booking_${bookingId}`).emit('booking:driverLocation', {
            driverId,
            bookingId,
            lat,
            lng,
            heading,
            speed,
            timestamp: new Date().toISOString(),
          });
        }

        // Update database with latest coordinates
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
      } catch (err) {
        console.error('[Socket.io] Location update error:', err);
      }
    });

    // Patient sends booking request
    socket.on('booking:newRequest', (bookingData: any) => {
      if (bookingData.driverId) {
        // Direct to target driver
        io.to(`driver_${bookingData.driverId}`).emit('booking:incomingRequest', bookingData);
      } else {
        // Broadcast to nearest pool
        io.to('online_drivers').emit('booking:incomingRequest', bookingData);
      }
      console.log(`[Socket.io] Dispatched new booking request ${bookingData._id || ''}`);
    });

    // Driver accepts booking
    socket.on('booking:driverAccepted', (data: { bookingId: string; driverId: string; patientId: string }) => {
      io.to(`user_${data.patientId}`).emit('booking:acceptedNotification', data);
      io.to(`booking_${data.bookingId}`).emit('booking:statusChanged', {
        status: 'ACCEPTED',
        bookingId: data.bookingId,
        driverId: data.driverId,
      });
    });

    // Driver updates ride lifecycle status
    socket.on('booking:updateStatus', (data: { bookingId: string; status: string; patientId?: string }) => {
      io.to(`booking_${data.bookingId}`).emit('booking:statusChanged', data);
      if (data.patientId) {
        io.to(`user_${data.patientId}`).emit('booking:statusChanged', data);
      }
    });

    // Emergency 1-Click SOS Broadcast
    socket.on('emergency:sosTriggered', (sosData: any) => {
      console.log(`[Socket.io] 🚨 SOS EMERGENCY ALERT:`, sosData);
      io.to('online_drivers').emit('emergency:highPriorityAlert', sosData);
      io.emit('emergency:hospitalAlert', sosData);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};
