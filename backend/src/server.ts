import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config();

import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import ambulanceRoutes from './routes/ambulances';
import hospitalRoutes from './routes/hospitals';
import requestRoutes from './routes/requests';
import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';
import queueRoutes from './routes/queue';
import uploadRoutes from './routes/upload';
import chatbotRoutes from './routes/chatbot';
import doctorRoutes from './routes/doctors';
import appointmentRoutes from './routes/appointments';
import emergencyContactRoutes from './routes/emergencyContacts';
import { setupSocketHandlers } from './socket';

const app = express();
const server = http.createServer(app);

// Dynamic CORS configuration allowing any localhost/127.0.0.1 port
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health-metrics', healthRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LifeLink Backend API' });
});

// Setup socket.io
const io = new Server(server, {
  cors: corsOptions,
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`LifeLink Backend Server running on port ${PORT}`);
});
