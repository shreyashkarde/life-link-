-- ============================================================================
-- 🏥 LIFELINK HEALTHCARE & EMERGENCY DISPATCH - SUPABASE SCHEMA
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS / PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PATIENT' CHECK (role IN ('PATIENT', 'DOCTOR', 'DRIVER', 'ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN')),
  phone TEXT DEFAULT '0000000000',
  image TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  gender TEXT DEFAULT 'Not Selected',
  dob TEXT DEFAULT 'Not Selected',
  address JSONB DEFAULT '{"line1": "", "line2": ""}'::jsonb,
  is_verified BOOLEAN DEFAULT TRUE,
  google_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS public.hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT DEFAULT 'Mumbai',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone TEXT,
  emergency_contact TEXT,
  trauma_level TEXT DEFAULT 'Level 1 Apex Trauma Center',
  icu_beds_available INTEGER DEFAULT 12,
  total_beds INTEGER DEFAULT 300,
  rating NUMERIC(3, 1) DEFAULT 4.8,
  doctors_count INTEGER DEFAULT 10,
  specialities TEXT[] DEFAULT ARRAY['General physician', 'Cardiology', 'Neurology', 'Trauma & Emergency', 'Orthopedics'],
  ambulance_service_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS public.doctors (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  image TEXT NOT NULL,
  speciality TEXT NOT NULL,
  degree TEXT DEFAULT 'MBBS, MD',
  experience TEXT DEFAULT '5 Years',
  about TEXT,
  fees NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  hospital_name TEXT,
  available BOOLEAN DEFAULT TRUE,
  slots_booked JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT,
  doc_id TEXT REFERENCES public.doctors(id) ON DELETE SET NULL,
  doctor_name TEXT NOT NULL,
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  hospital_name TEXT NOT NULL,
  slot_date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  consultation_type TEXT DEFAULT 'IN_CLINIC' CHECK (consultation_type IN ('IN_CLINIC', 'VIDEO')),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  notes TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  is_completed BOOLEAN DEFAULT FALSE,
  cancelled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AMBULANCES TABLE
CREATE TABLE IF NOT EXISTS public.ambulances (
  id TEXT PRIMARY KEY,
  vehicle_number TEXT UNIQUE NOT NULL,
  driver_id TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  hospital_name TEXT NOT NULL,
  type TEXT DEFAULT 'ALS' CHECK (type IN ('ALS', 'BLS', 'PTS', 'NEONATAL')),
  is_on_duty BOOLEAN DEFAULT TRUE,
  current_lat DOUBLE PRECISION NOT NULL,
  current_lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION DEFAULT 0,
  speed DOUBLE PRECISION DEFAULT 0,
  accuracy DOUBLE PRECISION DEFAULT 5,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AMBULANCE BOOKINGS (EMERGENCY SOS & DISPATCH)
CREATE TABLE IF NOT EXISTS public.ambulance_bookings (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  ambulance_id TEXT REFERENCES public.ambulances(id) ON DELETE SET NULL,
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  hospital_name TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  destination_address TEXT NOT NULL,
  status TEXT DEFAULT 'ASSIGNED' CHECK (status IN ('REQUESTED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'PATIENT_ONBOARD', 'COMPLETED', 'CANCELLED')),
  eta_minutes INTEGER DEFAULT 8,
  distance_km NUMERIC(6, 2) DEFAULT 3.2,
  is_emergency BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRESCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id TEXT PRIMARY KEY,
  appointment_id TEXT REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  doctor_id TEXT REFERENCES public.doctors(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  clinical_notes TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('DOCTOR', 'DRIVER', 'HOSPITAL')),
  target_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ⚡ ENABLE REALTIME REPLICATION (For Live GPS & Instant Bookings)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulance_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospitals;

-- ============================================================================
-- 🔒 ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Allow public read access on verified reference data
CREATE POLICY "Public read hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Public read ambulances" ON public.ambulances FOR SELECT USING (true);
CREATE POLICY "Public read ratings" ON public.ratings FOR SELECT USING (true);

-- Allow authenticated users full operations or service_role access
CREATE POLICY "Allow all for authenticated users on profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users on appointments" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users on ambulance_bookings" ON public.ambulance_bookings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users on prescriptions" ON public.prescriptions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users on ambulances" ON public.ambulances FOR ALL USING (true);

-- ============================================================================
-- 🌱 INITIAL SEED DATA (Top Hospitals, Doctors & Live Ambulances)
-- ============================================================================
INSERT INTO public.hospitals (id, name, address, city, lat, lng, phone, emergency_contact, trauma_level, icu_beds_available, total_beds, rating, specialities)
VALUES
  ('hosp_lilavati', 'Lilavati Hospital & Research Centre', 'A-791, Bandra Reclamation, Bandra West, Mumbai 400050', 'Mumbai', 19.0522, 72.8295, '+91 22 2675 1000', '+91 22 2656 8000', 'Level 1 Apex Trauma Center', 14, 323, 4.9, ARRAY['General physician', 'Cardiology', 'Neurology', 'Trauma & Emergency', 'Orthopedics']),
  ('hosp_hinduja', 'P.D. Hinduja Hospital & Medical Research Centre', 'Veer Savarkar Marg, Mahim West, Mumbai 400016', 'Mumbai', 19.0330, 72.8397, '+91 22 2445 1515', '+91 22 2445 2222', 'Level 1 Multi-Specialty & Cardiac Care', 9, 392, 4.8, ARRAY['General physician', 'Gynecologist', 'Pediatricians', 'Cardiology', 'Dermatologist']),
  ('hosp_nanavati', 'Nanavati Max Super Speciality Hospital', 'SV Rd, Near Vile Parle West, Mumbai 400056', 'Mumbai', 19.0968, 72.8402, '+91 22 2626 7500', '+91 22 2626 7777', 'Level 1 Comprehensive Cancer & Trauma Care', 18, 350, 4.8, ARRAY['General physician', 'Gastroenterologist', 'Neurologist', 'Oncology', 'Emergency Medicine']),
  ('hosp_fortis', 'Fortis Hospital Mulund', 'Mulund Goregaon Link Rd, Mumbai 400078', 'Mumbai', 19.1663, 72.9342, '+91 22 4365 4365', '+91 22 4365 4444', 'Level 1 Organ Transplant & Trauma Hub', 11, 315, 4.7, ARRAY['Cardiology', 'Neurology', 'Orthopedics', 'General physician'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.doctors (id, name, email, image, speciality, degree, experience, fees, about, hospital_id, hospital_name, available)
VALUES
  ('doc_1', 'Dr. Richard James', 'doc1@prescripto.com', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400', 'General physician', 'MBBS, MD', '4 Years', 50.00, 'Dr. Richard James is dedicated to providing comprehensive preventive and primary medical care.', 'hosp_lilavati', 'Lilavati Hospital & Research Centre', TRUE),
  ('doc_2', 'Dr. Emily Larson', 'doc2@prescripto.com', 'https://images.unsplash.com/photo-1594824813501-483569766442?w=400', 'Gynecologist', 'MBBS, MS (OBG)', '3 Years', 60.00, 'Specialist in maternal-fetal medicine, reproductive health, and minimally invasive procedures.', 'hosp_hinduja', 'P.D. Hinduja Hospital & Medical Research Centre', TRUE),
  ('doc_3', 'Dr. Sarah Patel', 'doc3@prescripto.com', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400', 'Dermatologist', 'MBBS, MD (Dermatology)', '5 Years', 45.00, 'Expert in clinical dermatology, allergy diagnostics, and restorative skin therapy.', 'hosp_nanavati', 'Nanavati Max Super Speciality Hospital', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ambulances (id, vehicle_number, driver_id, driver_name, driver_phone, hospital_id, hospital_name, type, is_on_duty, current_lat, current_lng)
VALUES
  ('amb_108', 'MH-02-EM-108', 'driver_108', 'Rajesh Kumar', '+91 98765 43210', 'hosp_lilavati', 'Lilavati Hospital & Research Centre', 'ALS', TRUE, 19.0522, 72.8295)
ON CONFLICT (id) DO NOTHING;
