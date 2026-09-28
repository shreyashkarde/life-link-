-- ============================================================================
-- 🧹 LIFELINK DATABASE CLEAN RESET SCRIPT
-- Run this in your Supabase SQL Editor anytime to wipe dynamic test records
-- ============================================================================

-- 1. Truncate dynamic transactional test tables
TRUNCATE TABLE public.appointments CASCADE;
TRUNCATE TABLE public.ambulance_bookings CASCADE;
TRUNCATE TABLE public.prescriptions CASCADE;
TRUNCATE TABLE public.ratings CASCADE;
TRUNCATE TABLE public.notifications CASCADE;

-- 2. Reset doctor booked slots back to empty
UPDATE public.doctors SET slots_booked = '{}'::jsonb;

-- 3. Reset ambulances to on-duty & idle status
UPDATE public.ambulances SET is_on_duty = TRUE, status = 'IDLE';

-- 4. Verify clean status
SELECT 'Appointments' AS table_name, count(*) FROM public.appointments
UNION ALL
SELECT 'Ambulance Bookings', count(*) FROM public.ambulance_bookings
UNION ALL
SELECT 'Prescriptions', count(*) FROM public.prescriptions
UNION ALL
SELECT 'Ratings', count(*) FROM public.ratings;
