import express, { Application, Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './socket/socketHandler';

// Routes
import authRoutes from './routes/authRoutes';
import doctorRoutes from './routes/doctorRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import ambulanceRoutes from './routes/ambulanceRoutes';
import bookingRoutes from './routes/bookingRoutes';
import ratingRoutes from './routes/ratingRoutes';
import adminRoutes from './routes/adminRoutes';

const app: Application = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'LifeLink Smart Healthcare & Ambulance Dispatch API is active',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);

// Setup Socket.io
setupSocketHandlers(io);

// Global Error Handler
app.use(errorHandler);

// Connect DB & Start Server
const startServer = async () => {
  await connectDB();
  server.listen(ENV.PORT, () => {
    console.log(`[LifeLink API] Server running on http://localhost:${ENV.PORT}`);
    console.log(`[LifeLink Socket.io] Real-time engine ready`);
  });
};

startServer();

export { app, io };
