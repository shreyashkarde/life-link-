import supabase, { isSupabaseConfigured } from '../config/supabase';

export const supabaseService = {
  // 👤 Profiles / Users
  async getProfileByEmail(email: string) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      if (error) {
        console.warn('⚠️ [Supabase Get Profile Error]:', error.message);
        return null;
      }
      return data;
    } catch (err: any) {
      console.warn('⚠️ [Supabase Profile Error]:', err.message);
      return null;
    }
  },

  async upsertProfile(profile: {
    id?: string;
    email: string;
    name: string;
    role?: string;
    image?: string;
    google_id?: string;
    phone?: string;
    address?: any;
    gender?: string;
    dob?: string;
  }) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            email: profile.email.toLowerCase().trim(),
            name: profile.name,
            role: profile.role || 'PATIENT',
            image: profile.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            google_id: profile.google_id || null,
            phone: profile.phone || '0000000000',
            address: profile.address ? (typeof profile.address === 'object' ? JSON.stringify(profile.address) : profile.address) : null,
            gender: profile.gender || 'Not Selected',
            dob: profile.dob || 'Not Selected',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
        .select()
        .maybeSingle();

      if (error) {
        console.warn('⚠️ [Supabase Upsert Profile Error]:', error.message);
        return null;
      }
      return data;
    } catch (err: any) {
      console.warn('⚠️ [Supabase Upsert Profile Exception]:', err.message);
      return null;
    }
  },

  // 🏥 Hospitals
  async getHospitals() {
    if (!isSupabaseConfigured() || !supabase) return [];
    try {
      const { data, error } = await supabase.from('hospitals').select('*');
      if (error) {
        console.warn('⚠️ [Supabase Get Hospitals Error]:', error.message);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  },

  async getHospitalById(id: string) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase.from('hospitals').select('*').eq('id', id).maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // 👨‍⚕️ Doctors
  async getDoctors(hospitalId?: string) {
    if (!isSupabaseConfigured() || !supabase) return [];
    try {
      let query = supabase.from('doctors').select('*, hospitals(*)');
      if (hospitalId && hospitalId !== 'ALL' && hospitalId !== 'all') {
        query = query.eq('hospital_id', hospitalId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('⚠️ [Supabase Get Doctors Error]:', error.message);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  },

  // 📅 Appointments
  async createAppointment(appointment: {
    patient_id?: string;
    patient_name: string;
    patient_email: string;
    patient_phone?: string;
    doctor_id?: string;
    doctor_name?: string;
    doctor_speciality?: string;
    hospital_id?: string;
    hospital_name?: string;
    slot_date: string;
    slot_time: string;
    amount?: number;
    payment_status?: string;
    status?: string;
  }) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('⚠️ [Supabase Create Appointment Error]:', error.message);
        return null;
      }
      return data;
    } catch (err: any) {
      console.warn('⚠️ [Supabase Appointment Exception]:', err.message);
      return null;
    }
  },

  async getAppointments(patientEmail?: string) {
    if (!isSupabaseConfigured() || !supabase) return [];
    try {
      let query = supabase.from('appointments').select('*').order('created_at', { ascending: false });
      if (patientEmail) {
        query = query.eq('patient_email', patientEmail.toLowerCase().trim());
      }
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  async updateAppointmentStatus(appointmentId: string, status: string, isCancelled = false) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          status,
          is_cancelled: isCancelled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)
        .select()
        .maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // 🚑 Ambulances & Live GPS Tracking
  async getAmbulances(hospitalId?: string) {
    if (!isSupabaseConfigured() || !supabase) return [];
    try {
      let query = supabase.from('ambulances').select('*');
      if (hospitalId && hospitalId !== 'ALL') {
        query = query.eq('hospital_id', hospitalId);
      }
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  async updateAmbulanceLocation(ambulanceId: string, lat: number, lng: number, heading = 0, speed = 0) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('ambulances')
        .update({
          current_lat: lat,
          current_lng: lng,
          heading,
          speed,
          last_updated: new Date().toISOString(),
        })
        .eq('id', ambulanceId)
        .select()
        .maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // 🚨 Ambulance Bookings
  async createAmbulanceBooking(booking: {
    patient_id?: string;
    patient_name: string;
    patient_phone: string;
    patient_condition?: string;
    ambulance_id?: string;
    driver_name?: string;
    hospital_id?: string;
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    status?: string;
    eta_minutes?: number;
  }) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('ambulance_bookings')
        .insert({
          ...booking,
          status: booking.status || 'SEARCHING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('⚠️ [Supabase Create Booking Error]:', error.message);
        return null;
      }
      return data;
    } catch (err: any) {
      console.warn('⚠️ [Supabase Booking Exception]:', err.message);
      return null;
    }
  },

  async updateAmbulanceBookingStatus(bookingId: string, status: string, extraData: any = {}) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('ambulance_bookings')
        .update({
          status,
          ...extraData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select()
        .maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // 💊 Prescriptions
  async createPrescription(prescription: {
    appointment_id?: string;
    patient_id?: string;
    patient_name: string;
    patient_email: string;
    doctor_name: string;
    diagnosis: string;
    medicines: any[];
    advice?: string;
  }) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert(prescription)
        .select()
        .maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // ⭐ Ratings
  async addRating(rating: {
    target_id: string;
    target_type: 'DOCTOR' | 'DRIVER' | 'HOSPITAL';
    user_name: string;
    user_email?: string;
    rating: number;
    review?: string;
  }) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('ratings')
        .insert(rating)
        .select()
        .maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // 🧹 Clear Old / Test Database Records
  async clearDynamicData() {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, message: 'Supabase not configured' };
    }
    try {
      console.log('🧹 [Supabase] Purging old dynamic test appointments, bookings, prescriptions, ratings...');
      await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ambulance_bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('prescriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return { success: true, message: 'Supabase dynamic test data cleared successfully' };
    } catch (err: any) {
      console.warn('⚠️ [Supabase Clear Dynamic Error]:', err.message);
      return { success: false, message: err.message };
    }
  },

  async clearAllData() {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, message: 'Supabase not configured' };
    }
    try {
      console.log('🧹 [Supabase] Full database reset requested...');
      await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ambulance_bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('prescriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return { success: true, message: 'All tables cleared successfully' };
    } catch (err: any) {
      console.warn('⚠️ [Supabase Clear All Error]:', err.message);
      return { success: false, message: err.message };
    }
  },
};

export default supabaseService;


