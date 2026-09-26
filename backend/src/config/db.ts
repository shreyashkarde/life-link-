import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from './env';

// Configure reliable DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  // Use system default DNS
}

let mongoConnected = false;

mongoose.set('bufferCommands', false);

// Real-time mongoose connection state monitors
mongoose.connection.on('connected', () => {
  mongoConnected = true;
  console.log('[MongoDB Event] Connection established successfully');
});

mongoose.connection.on('error', (err) => {
  mongoConnected = false;
  console.warn('[MongoDB Event] Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  mongoConnected = false;
  console.warn('[MongoDB Event] Disconnected from database');
});

export const connectDB = async (): Promise<boolean> => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5s fast failover for instant container boot
      bufferCommands: false,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    mongoConnected = true;
    return true;
  } catch (error: any) {
    mongoConnected = false;
    console.warn('--------------------------------------------------');
    console.warn('[MongoDB] External MongoDB offline or IP not whitelisted.');
    console.warn(`[MongoDB Error] ${error?.message || error}`);
    console.warn('--------------------------------------------------');
    return false;
  }
};

export const isMongoConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
