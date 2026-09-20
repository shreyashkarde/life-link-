import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  Phone,
  Ticket,
  ChevronRight,
  User,
  X,
  AlertTriangle
} from 'lucide-react';
import { MEDICAL_SPECIALIZATIONS } from '../../constants/specializations';

interface BookAppointmentSectionProps {
  apiFetch: (url: string, options?: any) => Promise<any>;
  patientLat?: number;
  patientLng?: number;
}

export const BookAppointmentSection: React.FC<BookAppointmentSectionProps> = ({
  apiFetch,
  patientLat,
  patientLng,
}) => {
  // Geolocation & Hospital state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    patientLat && patientLng ? { lat: patientLat, lng: patientLng } : null
  );
  const [geoDenied, setGeoDenied] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);

  // Doctor & Specialization state
  const [specializationFilter, setSpecializationFilter] = useState<string>('ALL');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);

  // Time Slot & Date state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  // Booking Modal & Symptoms
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [symptomsInput, setSymptomsInput] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<any | null>(null);

  // Patient's Existing Appointments
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [loadingMyAppointments, setLoadingMyAppointments] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // 1. Initial Geolocation Request
  useEffect(() => {
    requestUserLocation();
    fetchMyAppointments();
  }, []);

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      fetchHospitals(null, null, hospitalSearch);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setGeoDenied(false);
        setLocating(false);
        fetchHospitals(coords.lat, coords.lng, hospitalSearch);
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err.message);
        setGeoDenied(true);
        setLocating(false);
        fetchHospitals(null, null, hospitalSearch);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  // 2. Fetch Nearby Hospitals: LifeLink registered + real hospitals (OpenStreetMap)
  const fetchHospitals = async (lat: number | null, lng: number | null, searchStr: string) => {
    setLoadingHospitals(true);
    setHospitalError('');
    try {
      let query = '';
      if (lat !== null && lng !== null) {
        query += `lat=${lat}&lng=${lng}&radius=15`;
      }
      if (searchStr.trim()) {
        query += (query ? '&' : '') + `search=${encodeURIComponent(searchStr.trim())}`;
      }

      // 1) Hospitals registered on LifeLink (bookable)
      let registered: any[] = [];
      let registeredFailed = false;
      try {
        const res = await apiFetch(`/hospitals/nearby?${query}`);
        registered = (res.hospitals || []).map((h: any) => ({ ...h, isRegistered: true }));
      } catch (err) {
        registeredFailed = true;
        console.error('Failed to load registered hospitals:', err);
      }

      // 2) Real hospitals near the user (OpenStreetMap, not bookable)
      let real: any[] = [];
      if (lat !== null && lng !== null) {
        try {
          const osm = await apiFetch(`/hospitals/nearby-osm?${query}`);
          real = osm.hospitals || [];
        } catch (err) {
          console.warn('Failed to load real hospitals:', err);
        }
      }

      // Hide far-away registered hospitals when we have real nearby ones
      const nearRegistered = registered.filter(
        (h: any) => h.distanceKm == null || h.distanceKm <= 15
      );
      let list = [...nearRegistered, ...real];
      if (list.length === 0) list = registered;

      list.sort((a: any, b: any) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
      setHospitals(list);

      if (registeredFailed && list.length === 0) {
        setHospitalError('Hospitals load nahi hue. Check karo ki backend chal raha hai ya nahi.');
      }

      const firstRegistered = list.find((h: any) => h.isRegistered !== false);
      if (firstRegistered && !selectedHospital) {
        setSelectedHospital(firstRegistered);
      }
    } catch (err: any) {
      console.error('Failed to load nearby hospitals:', err);
      setHospitals([]);
      setHospitalError('Hospitals load nahi hue. Check karo ki backend chal raha hai ya nahi.');
    } finally {
      setLoadingHospitals(false);
    }
  };

  // 3. Fetch Doctors for Selected Hospital & Specialization (Feature 2)
  useEffect(() => {
    if (selectedHospital) {
      fetchDoctors(selectedHospital.id, specializationFilter);
    }
  }, [selectedHospital, specializationFilter]);

  const fetchDoctors = async (hospitalId: string, spec: string) => {
    setLoadingDoctors(true);
    try {
      let url = `/doctors?hospitalId=${hospitalId}`;
      if (spec !== 'ALL') {
        url += `&specialization=${encodeURIComponent(spec)}`;
      }
      const data = await apiFetch(url);
      setDoctors(data);
      // Reset selected doctor if not in new list
      setSelectedDoctor(null);
      setSlots([]);
      setSelectedSlot(null);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // 4. Fetch Slots for Selected Doctor and Date (Feature 4)
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchDoctorSlots(selectedDoctor.id, selectedDate);
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctorSlots = async (doctorId: string, dateStr: string) => {
    setLoadingSlots(true);
    try {
      const data = await apiFetch(`/doctors/${doctorId}/slots?date=${dateStr}`);
      setSlots(data.slots || []);
      setSelectedSlot(null);
    } catch (err) {
      console.error('Failed to load doctor slots:', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // 5. Fetch Patient's Booked Appointments
  const fetchMyAppointments = async () => {
    setLoadingMyAppointments(true);
    try {
      const list = await apiFetch('/appointments/my');
      setMyAppointments(list);
    } catch (err) {
      console.error('Failed to fetch patient appointments:', err);
    } finally {
      setLoadingMyAppointments(false);
    }
  };

  // 6. Transactional Atomic Booking (Feature 4)
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setBookingLoading(true);
    setBookingError('');

    try {
      const res = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          slotId: selectedSlot.id,
          symptoms: symptomsInput.trim() || undefined,
        }),
      });

      setConfirmedAppointment(res.appointment);
      setBookingModalOpen(false);
      setSymptomsInput('');

      // Refresh slot counts & appointment list
      if (selectedDoctor && selectedDate) {
        fetchDoctorSlots(selectedDoctor.id, selectedDate);
      }
      fetchMyAppointments();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book appointment. Slot may be fully booked.');
    } finally {
      setBookingLoading(false);
    }
  };

  // 7. Cancel Appointment
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment? Your reserved token will be released.')) return;
    setCancellingId(appointmentId);
    try {
      await apiFetch(`/appointments/${appointmentId}/cancel`, {
        method: 'PUT',
      });
      fetchMyAppointments();
      if (selectedDoctor && selectedDate) {
        fetchDoctorSlots(selectedDoctor.id, selectedDate);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* -------------------------------------------------------------
          Section Header & Geolocation Status
          ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Book Doctor Appointment
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select nearby hospital, choose your specialist, pick an hourly slot, and receive your priority OPD token.
            </p>
          </div>

          {/* Geolocation status pill */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {userCoords && !geoDenied ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live GPS Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                GPS Inactive (Fallback Search)
              </span>
            )}
            <button
              onClick={requestUserLocation}
              disabled={locating}
              className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              title="Refresh Geolocation"
            >
              <RefreshCw className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar for Hospital Fallback */}
        <div className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hospitals by name, area, or medical specialty..."
              value={hospitalSearch}
              onChange={(e) => setHospitalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchHospitals(
                    userCoords?.lat || null,
                    userCoords?.lng || null,
                    hospitalSearch
                  );
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>
          <button
            onClick={() =>
              fetchHospitals(
                userCoords?.lat || null,
                userCoords?.lng || null,
                hospitalSearch
              )
            }
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer"
          >
            Search
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          Feature 1: Nearby Hospital Selection Cards
          ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-rose-500" />
            Step 1: Choose Medical Facility (Nearest First)
          </h3>
          <span className="text-2xs text-slate-400 font-mono">
            {hospitals.length} centers available
          </span>
        </div>

        {hospitalError ? (
          <div className="p-8 text-center text-xs text-rose-500 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/40 rounded-3xl">
            {hospitalError}
          </div>
        ) : loadingHospitals ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl">
            Locating nearest hospitals with Haversine computation...
          </div>
        ) : hospitals.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl">
            No hospitals found matching your criteria. Try searching with a different keyword.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hospitals.map((h) => {
              const isSelected = selectedHospital?.id === h.id;
              return (
                <div
                  key={h.id}
                  onClick={() => {
                    if (h.isRegistered !== false) setSelectedHospital(h);
                  }}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-500 shadow-md shadow-rose-500/10'
                      : 'bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                        {h.name}
                      </h4>
                      {h.distanceLabel && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold whitespace-nowrap">
                          {h.distanceLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-3xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="line-clamp-1">{h.address}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-slate-850 flex items-center justify-between text-3xs">
                    <span className="text-slate-400">
                      {h.isRegistered === false ? (
                        <span className="flex items-center gap-3">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-blue-500 underline"
                          >
                            Get directions
                          </a>
                          {h.contactNumber && (
                            <a
                              href={`tel:${String(h.contactNumber).replace(/\s+/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-emerald-600 underline"
                            >
                              Call
                            </a>
                          )}
                        </span>
                      ) : h.doctors ? (
                        `${h.doctors.length} Doctors on staff`
                      ) : (
                        'Specialists available'
                      )}
                    </span>
                    <span className={`font-bold ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                      {h.isRegistered === false
                        ? 'Not on LifeLink'
                        : isSelected
                        ? '✓ Selected'
                        : 'Select Facility'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          Feature 2: Doctor Specialization Filter & Doctors
          ------------------------------------------------------------- */}
      {selectedHospital && (
        <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-rose-500" />
                Step 2: Choose Specialist at {selectedHospital.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Filter by medical discipline or doctor name
              </p>
            </div>

            {/* Specialization Dropdown */}
            <select
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Specializations</option>
              {MEDICAL_SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSpecializationFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                specializationFilter === 'ALL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-gray-200'
              }`}
            >
              All Specialties
            </button>
            {MEDICAL_SPECIALIZATIONS.slice(0, 7).map((spec) => (
              <button
                key={spec}
                onClick={() => setSpecializationFilter(spec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  specializationFilter === spec
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-gray-200'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>

          {/* Doctor List */}
          {loadingDoctors ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading verified doctors...</div>
          ) : doctors.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-gray-50 dark:bg-slate-900/50 rounded-2xl">
              No doctors currently listed under "{specializationFilter}" at this facility. Try another specialization.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => {
                const isDocSelected = selectedDoctor?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isDocSelected
                        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-500 shadow-md shadow-rose-500/10'
                        : 'bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            {doc.name}
                          </h4>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                            {doc.specialization}
                          </span>
                        </div>
                        {doc.consultationFee !== undefined && doc.consultationFee > 0 && (
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            ${doc.consultationFee}
                          </span>
                        )}
                      </div>

                      {doc.qualifications && (
                        <p className="text-3xs text-slate-500 dark:text-slate-400 font-medium">
                          {doc.qualifications} · {doc.experienceYears || 0}+ yrs experience
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between text-3xs font-bold">
                      <span className="text-slate-400">Select for time slots</span>
                      <span className={isDocSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}>
                        {isDocSelected ? '✓ Active Doctor' : 'Choose Doctor →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          Feature 4: Doctor Time Slots & Remaining Capacity Picker
          ------------------------------------------------------------- */}
      {selectedDoctor && (
        <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-500" />
                Step 3: Select Time Window for {selectedDoctor.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Remaining seats are protected in real-time with atomic concurrency locks.
              </p>
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <label className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {loadingSlots ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading slots & live capacity...</div>
          ) : slots.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-gray-50 dark:bg-slate-900/50 rounded-2xl">
              No consultation slots posted for {selectedDoctor.name} on {selectedDate}. Please select another date or doctor.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                const isFull = slot.remainingCapacity <= 0;

                return (
                  <button
                    key={slot.id}
                    disabled={isFull}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isFull
                        ? 'opacity-40 bg-gray-100 dark:bg-slate-900 border-gray-200 dark:border-slate-800 cursor-not-allowed'
                        : isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-rose-500/50'
                    }`}
                  >
                    <div>
                      <span className={`text-xs font-black block ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>

                    <div className="mt-3">
                      {isFull ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                          Fully Booked
                        </span>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {slot.remainingCapacity} seat{slot.remainingCapacity > 1 ? 's' : ''} left
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Book Action Button */}
          {selectedSlot && (
            <div className="pt-4 border-t border-gray-100 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Selected: <span className="font-bold text-slate-900 dark:text-white">{selectedDoctor.name}</span> on{' '}
                <span className="font-bold text-slate-900 dark:text-white">{selectedDate}</span> ({selectedSlot.startTime} - {selectedSlot.endTime})
              </div>
              <button
                onClick={() => setBookingModalOpen(true)}
                className="w-full sm:w-auto px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                Proceed to Book Token →
              </button>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          Booking Symptoms Modal (Feature 4)
          ------------------------------------------------------------- */}
      {bookingModalOpen && selectedSlot && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Confirm OPD Appointment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  A sequential token will be issued for {selectedDoctor.name}
                </p>
              </div>
              <button
                onClick={() => setBookingModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Summary card */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDoctor.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Specialization:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDoctor.specialization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hospital:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedHospital?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Schedule:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedDate} · {selectedSlot.startTime} - {selectedSlot.endTime}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Chief Complaint / Reason for Visit (Optional)
                </label>
                <textarea
                  rows={3}
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  placeholder="e.g. Persistent mild cough for 3 days, mild headache..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                >
                  {bookingLoading ? 'Securing Slot...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          Feature 4: High-Visibility Token Confirmation Pass Modal
          ------------------------------------------------------------- */}
      {confirmedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-950 border border-emerald-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Ticket className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-2xs font-extrabold uppercase tracking-widest text-emerald-500 font-mono">
                Booking Confirmed
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Your Priority OPD Token
              </h3>
            </div>

            {/* Massive Token Number Badge */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <span className="text-4xs font-mono uppercase tracking-widest text-slate-400 block mb-1">
                Queue Token Number
              </span>
              <span className="text-5xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                #{String(confirmedAppointment.tokenNumber).padStart(2, '0')}
              </span>
            </div>

            <div className="text-left p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {confirmedAppointment.doctor?.name} ({confirmedAppointment.doctor?.specialization})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hospital:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {confirmedAppointment.hospital?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Schedule:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {confirmedAppointment.slot?.date} · {confirmedAppointment.slot?.startTime} - {confirmedAppointment.slot?.endTime}
                </span>
              </div>
            </div>

            <p className="text-3xs text-slate-400">
              Please arrive 10 minutes prior to your time window and present this token number at the reception desk.
            </p>

            <button
              onClick={() => setConfirmedAppointment(null)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-black transition-colors cursor-pointer"
            >
              Done / Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          My Active & Upcoming Appointments Section
          ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-rose-500" />
            My Booked Doctor Appointments
          </h3>
          <button
            onClick={fetchMyAppointments}
            className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMyAppointments ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loadingMyAppointments ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading your appointments...</div>
        ) : myAppointments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-gray-50 dark:bg-slate-900/50 rounded-2xl">
            You have no active doctor appointments scheduled.
          </div>
        ) : (
          <div className="space-y-3">
            {myAppointments.map((apt) => {
              const isCancelled = apt.status === 'CANCELLED';
              const isCompleted = apt.status === 'COMPLETED';

              return (
                <div
                  key={apt.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCancelled
                      ? 'bg-gray-50/50 dark:bg-slate-900/30 border-gray-200 dark:border-slate-850 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono font-black text-lg flex items-center justify-center shrink-0">
                      #{String(apt.tokenNumber).padStart(2, '0')}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {apt.doctor?.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                          {apt.doctor?.specialization}
                        </span>
                      </div>
                      <p className="text-3xs text-slate-400 flex items-center gap-2">
                        <span>{apt.hospital?.name}</span>
                        <span>•</span>
                        <span>
                          {apt.slot?.date} ({apt.slot?.startTime} - {apt.slot?.endTime})
                        </span>
                      </p>
                      {apt.symptoms && (
                        <p className="text-3xs text-slate-500 italic">
                          Notes: "{apt.symptoms}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        isCompleted
                          ? 'bg-blue-500/10 text-blue-500'
                          : isCancelled
                          ? 'bg-slate-500/10 text-slate-400'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}
                    >
                      {apt.status}
                    </span>

                    {!isCancelled && !isCompleted && (
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        disabled={cancellingId === apt.id}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        {cancellingId === apt.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};