import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { StatCard } from '../components/common/StatCard';
import { DoctorCard } from '../components/patient/DoctorCard';
import { BookAppointmentModal } from '../components/patient/BookAppointmentModal';
import { AmbulanceBookingModal } from '../components/patient/AmbulanceBookingModal';
import { RatingModal } from '../components/patient/RatingModal';
import { SOSAlertButton } from '../components/patient/SOSAlertButton';
import { Badge } from '../components/common/Badge';
import { doctorAPI, appointmentAPI, bookingAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { Doctor, Appointment, AmbulanceBooking } from '../types';
import {
  Calendar,
  Truck,
  HeartPulse,
  Search,
  Clock,
  Star,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Radio,
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse tab from URL
  const queryParams = new URLSearchParams(location.search);
  const activeTabParam = queryParams.get('tab') || 'doctors';

  const [activeTab, setActiveTab] = useState(activeTabParam);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookings, setBookings] = useState<AmbulanceBooking[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<Doctor | null>(null);
  const [isAmbulanceModalOpen, setIsAmbulanceModalOpen] = useState(false);
  const [ratingModalData, setRatingModalData] = useState<{
    isOpen: boolean;
    targetType: 'DOCTOR' | 'DRIVER';
    targetId: string;
    targetName: string;
    bookingId?: string;
    appointmentId?: string;
  }>({
    isOpen: false,
    targetType: 'DOCTOR',
    targetId: '',
    targetName: '',
  });

  const specialties = ['All', 'Cardiology', 'Neurology', 'Orthopedics', 'General Medicine', 'Emergency & Trauma'];

  useEffect(() => {
    setActiveTab(activeTabParam);
  }, [activeTabParam]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docRes, apptRes, bookRes] = await Promise.all([
        doctorAPI.getAll({
          specialization: selectedSpecialty !== 'All' ? selectedSpecialty : undefined,
          search: searchQuery || undefined,
        }),
        appointmentAPI.getPatientAppointments(),
        bookingAPI.getPatientHistory(),
      ]);

      setDoctors(docRes.data.doctors || []);
      setAppointments(apptRes.data.appointments || []);
      setBookings(bookRes.data.bookings || []);
    } catch (err) {
      console.error('Error fetching patient dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket();
  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedSpecialty, searchQuery]);

  // Real-time multi-dashboard socket sync
  useEffect(() => {
    if (!socket) return;

    const handleRideAccepted = (data: any) => {
      addToast('success', '🚑 Ambulance Driver has ACCEPTED your request! En route now.', 'Driver Assigned');
      fetchData();
    };

    const handleStatusUpdate = (data: any) => {
      addToast('info', `Ambulance update: Status is now ${data.status?.replace(/_/g, ' ')}`);
      fetchData();
    };

    const handleApptCompleted = (data: any) => {
      addToast(
        'success',
        `🩺 Consultation with Dr. ${data.doctorName || 'Specialist'} marked completed. Prescription ready!`,
        'Consultation Complete'
      );
      fetchData();
    };

    socket.on('booking:acceptedNotification', handleRideAccepted);
    socket.on('booking:statusChanged', handleStatusUpdate);
    socket.on('appointment:completedNotification', handleApptCompleted);

    return () => {
      socket.off('booking:acceptedNotification', handleRideAccepted);
      socket.off('booking:statusChanged', handleStatusUpdate);
      socket.off('appointment:completedNotification', handleApptCompleted);
    };
  }, [socket]);

  // Active ongoing ambulance booking check
  const activeBooking = bookings.find((b) =>
    ['PENDING', 'ACCEPTED', 'ONGOING', 'ARRIVED_AT_PATIENT', 'ARRIVED_AT_HOSPITAL'].includes(b.status)
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Banner with 1-Click SOS */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-luxury relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Ambient specular highlight */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 uppercase tracking-wider">
                  Intelligent Emergency Grid
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                LifeLink Patient Emergency Hub
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed font-normal">
                Schedule verified specialist consultations or request an emergency ALS/BLS ambulance with sub-second GPS tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 relative z-10">
              <SOSAlertButton />
              <button
                onClick={() => setIsAmbulanceModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white text-surface-900 hover:bg-blue-50 font-black text-xs transition-all shadow-md hover:-translate-y-0.5"
              >
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Book Ambulance</span>
              </button>
            </div>
          </div>

          {/* Active Live Ride Tracker Banner if active */}
          {activeBooking && (
            <div className="p-4 bg-gradient-to-r from-blue-50 via-cyan-50/40 to-blue-50 border-2 border-blue-500 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-luxury animate-pulse">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-glow-blue">
                  🚑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-surface-900">
                      Active Ambulance Ride in Transit
                    </h4>
                    <Badge variant="primary" dot>{activeBooking.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-[11px] text-surface-600 mt-0.5 font-medium">
                    ETA: ~{activeBooking.etaMinutes} mins • {activeBooking.pickupLocation?.address}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/tracking/${activeBooking._id}`)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-glow-blue"
              >
                <span>Open Live Radar Map</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="My Consultations"
              value={appointments.length}
              subtitle={`${appointments.filter((a) => a.status === 'BOOKED').length} Scheduled Upcoming`}
              icon={Calendar}
              color="blue"
            />
            <StatCard
              title="Ambulance Trips"
              value={bookings.length}
              subtitle={`${bookings.filter((b) => b.status === 'COMPLETED').length} Successfully Completed`}
              icon={Truck}
              color="emerald"
            />
            <StatCard
              title="Network Specialists"
              value={doctors.length}
              subtitle="Verified Doctors on Duty"
              icon={Activity}
              color="indigo"
            />
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-surface-200/80 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'doctors', label: 'Consult Doctors', icon: HeartPulse },
                { id: 'appointments', label: 'My Appointments', icon: Calendar },
                { id: 'history', label: 'Ride History', icon: Truck },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      navigate(`/patient?tab=${tab.id}`, { replace: true });
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-glow-blue'
                        : 'text-surface-600 hover:bg-surface-100 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: DOCTOR SEARCH & DISCOVERY */}
          {activeTab === 'doctors' && (
            <div className="space-y-4">
              {/* Search & Specialty Filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <label htmlFor="doctor-search" className="sr-only">Search doctor by name</label>
                  <input
                    id="doctor-search"
                    name="doctorSearch"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search doctor by name or department..."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs"
                  />
                  <Search className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {specialties.map((sp) => (
                    <button
                      key={sp}
                      onClick={() => setSelectedSpecialty(sp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedSpecialty === sp
                          ? 'bg-blue-600 text-white shadow-soft'
                          : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
                      }`}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor Cards Grid */}
              {loading ? (
                <div className="text-center py-12 text-surface-400 text-xs font-mono">Loading verified medical specialists...</div>
              ) : doctors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctors.map((doctor) => (
                    <DoctorCard
                      key={doctor._id}
                      doctor={doctor}
                      onBookAppointment={(doc) => setSelectedDoctorForBooking(doc)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-surface-200/80 text-surface-500 text-xs shadow-xs">
                  No doctors found matching criteria.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="glass-card rounded-3xl border border-surface-200/80 shadow-luxury overflow-hidden">
              <div className="p-4 border-b border-surface-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Doctor Consultation Appointments ({appointments.length})
                </h3>
              </div>

              {appointments.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {appointments.map((appt) => (
                    <div key={appt._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-surface-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={
                            appt.doctorId?.userId?.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              appt.doctorId?.userId?.name || 'Dr'
                            )}&background=2563EB&color=fff&bold=true`
                          }
                          alt="Doctor"
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-600/20 shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-surface-900">
                              {appt.doctorId?.userId?.name}
                            </h4>
                            <Badge variant={appt.status === 'COMPLETED' ? 'success' : appt.status === 'CANCELLED' ? 'danger' : 'primary'}>
                              {appt.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-surface-500 mt-0.5">
                            {appt.doctorId?.specialization} • ₹{appt.consultationFee}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-surface-700 font-bold">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              {appt.slotDate} at {appt.slotTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {appt.status === 'COMPLETED' && (
                          <button
                            onClick={() =>
                              setRatingModalData({
                                isOpen: true,
                                targetType: 'DOCTOR',
                                targetId: appt.doctorId?._id,
                                targetName: appt.doctorId?.userId?.name || 'Doctor',
                                appointmentId: appt._id,
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 hover:bg-surface-100 text-xs font-semibold text-surface-700 transition-colors"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span>Rate Doctor</span>
                          </button>
                        )}
                        <span className="text-xs font-bold text-surface-900 px-3 py-1.5 bg-surface-50 rounded-xl border border-surface-200">
                          {appt.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-surface-400 text-xs">No booked appointments yet.</div>
              )}
            </div>
          )}

          {/* TAB 3: AMBULANCE RIDE HISTORY */}
          {activeTab === 'history' && (
            <div className="glass-card rounded-3xl border border-surface-200/80 shadow-luxury overflow-hidden">
              <div className="p-4 border-b border-surface-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Ambulance Dispatch History ({bookings.length})
                </h3>
              </div>

              {bookings.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {bookings.map((b) => (
                    <div key={b._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-surface-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shadow-xs">
                          🚑
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-surface-900">
                              Ride #{b._id.slice(-6)} • {b.ambulanceType}
                            </h4>
                            <Badge variant={b.status === 'COMPLETED' ? 'success' : b.status === 'CANCELLED' ? 'danger' : 'primary'} dot>
                              {b.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-surface-500 mt-0.5 font-medium">
                            Pickup: {b.pickupLocation?.address}
                          </p>
                          <p className="text-[11px] text-surface-400 font-mono">
                            {new Date(b.createdAt).toLocaleString()} • Fare: ₹{b.fare}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {['PENDING', 'ACCEPTED', 'ONGOING', 'ARRIVED_AT_PATIENT'].includes(b.status) && (
                          <button
                            onClick={() => navigate(`/tracking/${b._id}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-glow-blue"
                          >
                            <span>Live Track</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {b.status === 'COMPLETED' && b.driverId && (
                          <button
                            onClick={() =>
                              setRatingModalData({
                                isOpen: true,
                                targetType: 'DRIVER',
                                targetId: b.driverId?._id || b.driverId?.id || '',
                                targetName: b.driverId?.name || 'Driver',
                                bookingId: b._id,
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 hover:bg-surface-100 text-xs font-semibold text-surface-700 transition-colors"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span>Rate Driver</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-surface-400 text-xs">No ambulance ride requests yet.</div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        doctor={selectedDoctorForBooking}
        isOpen={!!selectedDoctorForBooking}
        onClose={() => setSelectedDoctorForBooking(null)}
        onSuccess={fetchData}
      />

      {/* Book Ambulance Modal */}
      <AmbulanceBookingModal
        isOpen={isAmbulanceModalOpen}
        onClose={() => setIsAmbulanceModalOpen(false)}
        onBookingSuccess={fetchData}
      />

      {/* Rating & Review Modal */}
      <RatingModal
        isOpen={ratingModalData.isOpen}
        onClose={() => setRatingModalData((prev) => ({ ...prev, isOpen: false }))}
        targetType={ratingModalData.targetType}
        targetId={ratingModalData.targetId}
        targetName={ratingModalData.targetName}
        bookingId={ratingModalData.bookingId}
        appointmentId={ratingModalData.appointmentId}
        onSuccess={fetchData}
      />
    </div>
  );
};
