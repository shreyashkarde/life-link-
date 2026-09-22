import mongoose from 'mongoose';
import { ENV } from './env';

let mongoConnected = false;

export const connectDB = async (): Promise<boolean> => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000, // Quick failover to mock store if local Mongo is not running
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    mongoConnected = true;
    return true;
  } catch (error: any) {
    mongoConnected = false;
    console.warn('--------------------------------------------------');
    console.warn('[MongoDB] No local MongoDB service detected on ' + ENV.MONGODB_URI);
    console.warn('[LifeLink] Seamless In-Memory Data Store Activated!');
    console.warn('[LifeLink] All 5 Demo Roles, Slots, and Ambulances are ONLINE and ready.');
    console.warn('--------------------------------------------------');
    return false;
  }
};

export const isMongoConnected = (): boolean => {
  return mongoConnected && mongoose.connection.readyState === 1;
};
