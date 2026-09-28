import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { supabaseService } from '../services/supabaseService';
import { clearEntireStore } from '../config/prescriptoStore';

async function clearDatabase() {
  console.log('==============================================');
  console.log('🧹 [DB-Clear] Starting Clean Database Reset...');
  console.log('==============================================');

  try {
    // 1. Wipe in-memory mock store
    clearEntireStore();
    console.log('✓ [1/2] In-memory cache & local bookings cleared.');

    // 2. Wipe Supabase dynamic tables (appointments, ambulance bookings, prescriptions, ratings)
    const supabaseRes = await supabaseService.clearDynamicData();
    console.log(`✓ [2/2] Supabase dynamic tables reset: ${supabaseRes.message}`);

    console.log('==============================================');
    console.log('🎉 SUCCESS: Old database records completely cleared!');
    console.log('==============================================');
  } catch (error: any) {
    console.error('❌ [DB-Clear Error]:', error.message);
  } finally {
    process.exit(0);
  }
}

clearDatabase();
