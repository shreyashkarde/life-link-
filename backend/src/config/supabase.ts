import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('⚡ [Supabase Backend] Successfully initialized client connection');
  } catch (err: any) {
    console.warn('⚠️ [Supabase Backend Init Warning]:', err.message);
  }
} else {
  console.log('ℹ️ [Supabase Backend] SUPABASE_URL / SUPABASE_KEY not provided in .env yet.');
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabase !== null);
};

export default supabase;
