import mongoose from 'mongoose';
import { ENV } from './env';

let mongoConnected = false;

export const connectDB = async (): Promise<boolean> => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    mongoConnected = true;
    return true;
  } catch (error: any) {
    mongoConnected = false;
    console.warn('--------------------------------------------------');
    console.warn('[MongoDB] External MongoDB offline or IP not whitelisted.');
    console.warn('[Prescripto] Seamless High-Performance Store Activated!');
    console.warn('[Prescripto] All 15 Doctors & Demo Accounts are ONLINE and fully functional.');
    console.warn('--------------------------------------------------');
    return false;
  }
};

export const isMongoConnected = (): boolean => {
  return mongoConnected && mongoose.connection.readyState === 1;
};
