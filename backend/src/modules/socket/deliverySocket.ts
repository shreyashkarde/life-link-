import { Server as SocketIOServer, Socket } from 'socket.io';

export interface DeliveryLocationPayload {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

/**
 * 📦 Isolated Delivery & Real-Time Driver Tracking Socket Module
 * 
 * Rules:
 *  - 100% isolated module
 *  - Events:
 *      1. joinOrder -> socket joins room (orderId)
 *      2. sendLocation -> broadcast to that room as 'locationUpdate'
 *  - No change to existing APIs or schemas
 */
export const initDeliverySocket = (io: SocketIOServer) => {
  if (!io) return;

  io.on('connection', (socket: Socket) => {
    // 1. Join Order Room
    socket.on('joinOrder', (data: { orderId: string } | string) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) {
        socket.join(orderId);
        socket.join(`order_${orderId}`);
        console.log(`[DeliverySocket] 🔌 Client ${socket.id} joined order room: ${orderId}`);
      }
    });

    // 2. Driver Sends Live GPS Location
    socket.on('sendLocation', (data: DeliveryLocationPayload) => {
      if (!data || !data.orderId) return;

      const payload: DeliveryLocationPayload = {
        orderId: data.orderId,
        driverId: data.driverId || 'driver_default',
        lat: Number(data.lat),
        lng: Number(data.lng),
        heading: data.heading !== undefined ? Number(data.heading) : undefined,
        speed: data.speed !== undefined ? Number(data.speed) : undefined,
        timestamp: data.timestamp || Date.now(),
      };

      // Broadcast 'locationUpdate' to everyone listening to this orderId
      socket.to(data.orderId).emit('locationUpdate', payload);
      socket.to(`order_${data.orderId}`).emit('locationUpdate', payload);
      io.to(data.orderId).emit('locationUpdate', payload);
      io.to(`order_${data.orderId}`).emit('locationUpdate', payload);
    });

    // 3. Leave Order Room
    socket.on('leaveOrder', (data: { orderId: string } | string) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) {
        socket.leave(orderId);
        socket.leave(`order_${orderId}`);
        console.log(`[DeliverySocket] 🔌 Client ${socket.id} left order room: ${orderId}`);
      }
    });
  });

  console.log('✅ [Delivery Socket] Isolated Delivery & Live Tracking module initialized successfully');
};

export default initDeliverySocket;
