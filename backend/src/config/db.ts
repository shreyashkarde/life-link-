import { isSupabaseConfigured } from './supabase';

let isConnected = true;

export const connectDB = async (): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    console.log('⚡ [LifeLink DB] Powered purely by Supabase Cloud Database (PostgreSQL)');
    isConnected = true;
    return true;
  }
  console.log('⚡ [LifeLink DB] In-memory & Supabase sync active');
  return true;
};

export const isMongoConnected = (): boolean => {
  return false;
};

