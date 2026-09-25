/**
 * 📦 Isolated Delivery & Real-Time Driver Tracking Socket Module (JS)
 * 
 * Events:
 *  1. joinOrder -> socket joins room (orderId)
 *  2. sendLocation -> broadcast to that room as 'locationUpdate'
 */
function initDeliverySocket(io) {
  if (!io) return;

  io.on('connection', (socket) => {
    // 1. Join Order Room
    socket.on('joinOrder', (data) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) {
        socket.join(orderId);
        socket.join(`order_${orderId}`);
        console.log(`[DeliverySocket] 🔌 Client ${socket.id} joined order room: ${orderId}`);
      }
    });

    // 2. Driver Sends Live GPS Location
    socket.on('sendLocation', (data) => {
      if (!data || !data.orderId) return;

      const payload = {
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
    socket.on('leaveOrder', (data) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) {
        socket.leave(orderId);
        socket.leave(`order_${orderId}`);
      }
    });
  });

  console.log('✅ [Delivery Socket] Isolated Delivery & Live Tracking module (JS) initialized');
}

module.exports = initDeliverySocket;
module.exports.initDeliverySocket = initDeliverySocket;
