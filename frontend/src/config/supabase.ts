import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cujlogezjybpzpdaarmf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_GJNu7lERFL0Ru4PsC-isaw_HcEkPJCO';

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    console.log('⚡ [Supabase Frontend] Connected to Supabase Realtime & Database');
  } catch (err) {
    console.warn('⚠️ [Supabase Frontend Init Notice]:', err);
  }
}

export const createClient = () => {
  return supabase || createSupabaseClient(supabaseUrl, supabaseAnonKey);
};

export const isSupabaseReady = (): boolean => Boolean(supabase !== null);

export default supabase;

