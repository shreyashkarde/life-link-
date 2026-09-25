import express, { Application, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './socket/socketHandler';

// Prescripto Doctor Appointment Routes
import adminRouter from './routes/adminRoutes';
import doctorRouter from './routes/doctorRoutes';
import userRouter from './routes/userRoutes';

// Smart Healthcare & Ambulance Dispatch Routes
import authRouter from './routes/authRoutes';
import ambulanceRouter from './routes/ambulanceRoutes';
import bookingRouter from './routes/bookingRoutes';
import ratingRouter from './routes/ratingRoutes';
import hospitalRouter from './routes/hospitalRoutes';

const app: Application = express();
const server = http.createServer(app);

// Initialize Socket.io (strictly room-based real-time communication)
const io = new SocketIOServer(server, {
  cors: {
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});
initSocket(io);

import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Middlewares - reflect origin for withCredentials support
import { hospitalContextMiddleware } from './middleware/hospitalIsolation';

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cookieParser());

const corsOptions = {
  origin: (_origin: any, callback: any) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'token',
    'aToken',
    'atoken',
    'dToken',
    'dtoken',
    'x-refresh-token',
    'x-role',
    'x-hospital-id',
    'Cache-Control',
    'Pragma',
    'Expires',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Accept-Language',
  ],
  exposedHeaders: ['Authorization', 'token', 'aToken', 'dToken'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(hospitalContextMiddleware);

// 🧹 Global No-Cache & Fresh DB Sync Middleware (Strictly prevents 304 stale caching)
app.use((req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API Hit] ${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
  });
  next();
});

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Smart Healthcare & Emergency Ambulance Dispatch API is operational',
    timestamp: new Date().toISOString(),
    features: [
      'Doctor Appointment Booking',
      'Ambulance Booking & Live GPS Tracking',
      'One-Click Emergency SOS Auto-Dispatch',
      'Dynamic Doctor & Driver Rating System',
      'Role-Based Access Control (RBAC)',
      'Room-Based Real-time Socket.io Engine',
    ],
  });
});

// Prescripto Doctor Appointment Endpoints
app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/doctors', doctorRouter); // Friendly alias
app.use('/api/user', userRouter);

// Smart Healthcare & Ambulance Dispatch Endpoints
app.use('/api/auth', authRouter);
app.use('/api/ambulance', ambulanceRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/ratings', ratingRouter);
app.use('/api/hospitals', hospitalRouter);
app.use('/api/hospital', hospitalRouter);
app.use('/api/superadmin', hospitalRouter);
app.use('/api/driver', authRouter);

// Advanced Modular Features (Tracking, Hospitals, Notifications, Auth Enhancements, Rate Limiter)
import { registerModularFeatures } from './features';
registerModularFeatures(app);

// Global Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(ENV.PORT, () => {
      console.log(`[Smart Healthcare API] Server running on http://localhost:${ENV.PORT}`);
      console.log(`[Socket.io] Real-time engine attached and listening on port ${ENV.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();

// Real-time synchronization active for all 15 doctors across dashboards
export { app, server };
