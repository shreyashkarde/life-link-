import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';
import { socketService } from '../../services/socket';

interface MedicineItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export const DoctorDashboard: React.FC = () => {
  const { showToast, backendUrl, dToken, doctorData } = useApp();
  const apiBase = backendUrl || 'http://localhost:5000';

  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [togglingStatus, setTogglingStatus] = useState<boolean>(false);
  const [dashData, setDashData] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Selected Patient for Active Chart & Rx
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // 7-Day Slot Management State
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [slotSchedule, setSlotSchedule] = useState<Record<string, string[]>>({
    '0': ['09:00 am', '09:30 am', '10:00 am', '10:30 am', '11:00 am', '02:00 pm', '02:30 pm', '03:00 pm', '04:30 pm', '05:00 pm'],
    '1': ['09:30 am', '10:00 am', '10:30 am', '11:30 am', '02:00 pm', '02:30 pm', '04:00 pm'],
    '2': ['10:00 am', '10:30 am', '11:00 am', '02:00 pm', '03:00 pm', '05:00 pm'],
    '3': ['09:00 am', '09:30 am', '10:30 am', '11:00 am', '02:30 pm', '04:00 pm'],
    '4': ['09:00 am', '10:00 am', '11:00 am', '02:00 pm', '03:30 pm', '05:00 pm'],
    '5': ['10:00 am', '11:00 am', '02:00 pm', '03:00 pm'],
    '6': ['09:30 am', '10:30 am', '11:30 am', '02:00 pm', '04:00 pm'],
  });

  // Prescription Form State
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    { id: '1', name: 'Amoxicillin 500mg', dosage: '1 Capsule', frequency: 'TDS (3x a day)', duration: '5 Days' },
    { id: '2', name: 'Paracetamol 650mg', dosage: '1 Tablet', frequency: 'SOS (When needed)', duration: '3 Days' },
  ]);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [isSubmittingRx, setIsSubmittingRx] = useState<boolean>(false);

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 7 Days generator for slot manager
  const next7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      index: i,
      dayName: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      fullDate: d.toISOString().split('T')[0],
    };
  });

  // Fetch Doctor Dashboard API Data
  const fetchDoctorDashboardData = async () => {
    try {
      setLoading(true);
      const token = dToken || sessionStorage.getItem('dToken') || localStorage.getItem('token') || '';
      const { data } = await axios.get(`${apiBase}/api/doctor/dashboard`, {
        headers: { dtoken: token, token },
      });
      if (data.success && data.dashData) {
        setDashData(data.dashData);
        if (Array.isArray(data.dashData.latestAppointments)) {
          setConsultations(data.dashData.latestAppointments);
          if (data.dashData.latestAppointments.length > 0 && !selectedAppointment) {
            setSelectedAppointment(data.dashData.latestAppointments[0]);
          }
        }
      }
    } catch (error: any) {
      console.error('Doctor Dashboard Fetch Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔔 Socket.IO Real-Time Doctor Notifications
  useEffect(() => {
    fetchDoctorDashboardData();

    const docId = doctorData?._id || 'doc1';
    socketService.connect();
    socketService.joinDoctor(docId);

    socketService.onNewAppointment((appointment: any) => {
      const patientName = appointment?.userData?.name || appointment?.patientName || 'A patient';
      const slot = `${appointment?.slotDate || 'today'} at ${appointment?.slotTime || ''}`;
      showToast(`🔔 New Appointment Alert: ${patientName} booked a consultation for ${slot}!`, 'info');
      fetchDoctorDashboardData();
    });

    return () => {
      // Clean cleanup
    };
  }, [dToken, apiBase, doctorData?._id]);

  // Handle Availability Toggle
  const handleToggleAvailability = async () => {
    try {
      setTogglingStatus(true);
      const nextStatus = !isAvailable;
      const token = dToken || sessionStorage.getItem('dToken') || localStorage.getItem('token') || '';
      const docId = doctorData?._id || 'doc1';

      const { data } = await axios.post(
        `${apiBase}/api/doctor/change-availability`,
        { docId, isAvailable: nextStatus, available: nextStatus },
        { headers: { dtoken: token, token } }
      );

      if (data.success) {
        setIsAvailable(nextStatus);
        showToast(
          `Doctor Status: ${nextStatus ? '🟢 Available (Accepting Bookings)' : '🔴 Not Available (Offline)'}`,
          nextStatus ? 'success' : 'info'
        );
      } else {
        setIsAvailable(nextStatus);
      }
    } catch (e: any) {
      setIsAvailable(!isAvailable);
      showToast(`Doctor Status: ${!isAvailable ? '🟢 Available' : '🔴 Not Available'}`, 'info');
    } finally {
      setTogglingStatus(false);
    }
  };

  // Complete Appointment Action
  const handleComplete = async (id: string) => {
    try {
      const token = dToken || sessionStorage.getItem('dToken') || localStorage.getItem('token') || '';
      const { data } = await axios.post(
        `${apiBase}/api/doctor/complete-appointment`,
        { appointmentId: id },
        { headers: { dtoken: token, token } }
      );
      if (data.success) {
        showToast('Consultation marked as Completed. Earnings credited.', 'success');
        fetchDoctorDashboardData();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Error completing consultation', 'error');
    }
  };

  // Cancel Appointment Action
  const handleCancel = async (id: string) => {
    try {
      const token = dToken || sessionStorage.getItem('dToken') || localStorage.getItem('token') || '';
      const { data } = await axios.post(
        `${apiBase}/api/doctor/cancel-appointment`,
        { appointmentId: id },
        { headers: { dtoken: token, token } }
      );
      if (data.success) {
        showToast('Consultation cancelled.', 'info');
        fetchDoctorDashboardData();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Error cancelling consultation', 'error');
    }
  };

  // Add Medicine Row
  const handleAddMedicine = () => {
    const newMed: MedicineItem = {
      id: Date.now().toString(),
      name: '',
      dosage: '1 Tablet',
      frequency: 'BD (2x a day)',
      duration: '5 Days',
    };
    setMedicines([...medicines, newMed]);
  };

  // Remove Medicine Row
  const handleRemoveMedicine = (id: string) => {
    setMedicines(medicines.filter((m) => m.id !== id));
  };

  // Update Medicine Field
  const handleUpdateMedicine = (id: string, field: keyof MedicineItem, val: string) => {
    setMedicines(medicines.map((m) => (m.id === id ? { ...m, [field]: val } : m)));
  };

  // Submit Prescription & Finalize
  const handleSubmitPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      showToast('Please enter a clinical diagnosis.', 'error');
      return;
    }
    setIsSubmittingRx(true);
    setTimeout(() => {
      setIsSubmittingRx(false);
      showToast('Digital Prescription signed & issued to Patient Record! ✓', 'success');
      if (selectedAppointment) {
        handleComplete(selectedAppointment._id || selectedAppointment.id);
      }
      setDiagnosis('');
      setClinicalNotes('');
    }, 600);
  };

  // Filtered Queue
  const filteredQueue = consultations.filter((item) => {
    if (filterStatus === 'SCHEDULED') return !item.isCompleted && !item.cancelled;
    if (filterStatus === 'COMPLETED') return item.isCompleted;
    if (filterStatus === 'CANCELLED') return item.cancelled;
    return true;
  });

  const scheduledCount = consultations.filter((c) => !c.isCompleted && !c.cancelled).length;
  const completedCount = consultations.filter((c) => c.isCompleted).length;
  const totalEarnings = dashData?.earnings ?? (completedCount * (doctorData?.fees || 50));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-20 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Universal Dashboard Navbar */}
      <DashboardNavbar
        currentRole="DOCTOR"
        userName={doctorData?.name || 'Dr. Richard James'}
        userSubtitle={`${doctorData?.speciality || 'General Physician'} • Prescripto Certified`}
        avatarUrl={doctorData?.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-7">
        
        {/* ========================================================================= */}
        {/* 1. HEADER SECTION (Greeting, Date & Availability Toggle)                  */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="relative">
              <img
                src={doctorData?.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300'}
                alt={doctorData?.name || 'Doctor'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-200 shadow-xs"
              />
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
              }`}></span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  {doctorData?.name || 'Dr. Richard James'} 👋
                </h1>
                <span className="text-blue-600 text-base font-black" title="Verified Practitioner">✓</span>
              </div>
              
              <p className="text-xs sm:text-sm text-[#64748B] font-medium">
                {doctorData?.speciality || 'General Physician'} • Apex Trauma Network • {todayFormatted}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  <span>🏥</span> Lilavati Hospital & Research Centre
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span>💰</span> ${doctorData?.fees || 50} / session
                </span>
              </div>
            </div>
          </div>

          {/* Availability Status Controller */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <button
              type="button"
              disabled={togglingStatus}
              onClick={handleToggleAvailability}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                isAvailable
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
              <span>{isAvailable ? '🟢 Available (Consulting)' : '🔴 Not Available (Offline)'}</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. STATS CARDS (TOP METRIC OVERVIEW)                                     */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Card 1: Total Patients */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Total Patients</span>
              <span className="text-blue-600 text-base">👥</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{dashData?.patients ?? consultations.length}</p>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block">
              Unique Consults
            </span>
          </div>

          {/* Card 2: Upcoming Appointments */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Upcoming Queue</span>
              <span className="text-amber-500 text-base">📅</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{scheduledCount}</p>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block">
              Scheduled Today
            </span>
          </div>

          {/* Card 3: Completed Consultations */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Completed Consults</span>
              <span className="text-emerald-600 text-base">✓</span>
            </div>
            <p className="text-2xl font-black text-emerald-700">{completedCount}</p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Prescriptions Issued
            </span>
          </div>

          {/* Card 4: Total Earnings */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Total Earnings</span>
              <span className="text-emerald-600 text-base">💰</span>
            </div>
            <p className="text-2xl font-black text-[#2563EB]">${totalEarnings}</p>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block">
              100% Disbursed
            </span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. MAIN WORKSPACE (Appointment Queue + Patient Chart / Rx Writer)         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          
          {/* LEFT COLUMN: Patient Queue (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Queue Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                    <span>📋</span> Patient Queue
                  </h2>
                  <p className="text-xs text-[#64748B]">Today's clinical intake roster</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  {consultations.length} Patients
                </span>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterStatus === st
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'SCHEDULED' ? 'Scheduled' : st === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                  </button>
                ))}
              </div>

              {/* Queue List */}
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                    </div>
                  ))
                ) : filteredQueue.length > 0 ? (
                  filteredQueue.map((item: any) => {
                    const isSelected = selectedAppointment?._id === item._id || selectedAppointment?.id === item.id;
                    const isCompleted = item.isCompleted || item.status === 'COMPLETED';
                    const isCancelled = item.cancelled || item.status === 'CANCELLED';

                    return (
                      <div
                        key={item._id || item.id}
                        onClick={() => setSelectedAppointment(item)}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer space-y-3 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 shadow-xs'
                            : 'border-slate-200/80 hover:border-blue-300 bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                item.userData?.image ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'
                              }
                              alt="Patient"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <h3 className="text-sm font-bold text-[#0F172A]">
                                {item.userData?.name || item.patientName || 'Edward Vincent'}
                              </h3>
                              <p className="text-xs text-[#64748B]">
                                Slot: <strong className="text-blue-700 font-semibold">{item.slotTime}</strong> • {item.slotDate?.replace(/_/g, ' / ')}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isCancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Scheduled'}
                          </span>
                        </div>

                        {/* Patient info details */}
                        <div className="text-[11px] text-[#64748B] flex items-center justify-between border-t border-slate-100/80 pt-2">
                          <span>Phone: {item.userData?.phone || item.patientPhone || '+91 98765 43210'}</span>
                          <span className="font-bold text-slate-900">${item.amount || item.fees || 50}</span>
                        </div>

                        {/* Action buttons */}
                        {!isCompleted && !isCancelled && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointment(item);
                                showToast(`Loaded chart for ${item.userData?.name || 'Patient'}. Ready to prescribe.`, 'info');
                              }}
                              className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                            >
                              Open Chart & Rx →
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete(item._id || item.id);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                              title="Mark Complete"
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(item._id || item.id);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-[#64748B] bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <span className="text-3xl block">📋</span>
                    <p className="text-sm font-semibold text-[#0F172A]">No appointments in this category.</p>
                    <p className="text-xs text-[#64748B]">New patient intakes from Prescripto will automatically populate here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. SLOT MANAGEMENT (7-DAY TIMETABLE)                                     */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <span>🕒</span> 7-Day Slot Availability
                  </h2>
                  <p className="text-xs text-[#64748B]">Configure daily consultation capacity</p>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  AUTO SYNC
                </span>
              </div>

              {/* 7 Days Selector Bar */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {next7Days.map((day) => (
                  <button
                    key={day.index}
                    onClick={() => setSelectedDayIndex(day.index)}
                    className={`p-2 rounded-xl text-xs transition-all cursor-pointer flex flex-col items-center justify-center ${
                      selectedDayIndex === day.index
                        ? 'bg-[#2563EB] text-white shadow-xs font-bold scale-105'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                    }`}
                  >
                    <span className="text-[10px] uppercase">{day.dayName}</span>
                    <span className="text-sm font-black">{day.dateNum}</span>
                  </button>
                ))}
              </div>

              {/* Time Slots Grid for Selected Day */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold text-slate-800">
                    {next7Days[selectedDayIndex]?.dayName} Slots ({slotSchedule[selectedDayIndex.toString()]?.length || 0} Open)
                  </span>
                  <span className="text-[11px] text-blue-600 font-semibold">30 Min Sessions</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {slotSchedule[selectedDayIndex.toString()]?.map((slotTime, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50/80 text-blue-800 border border-blue-200/80 flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      {slotTime}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Patient Chart & Prescription Writer (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 5. Patient Details Panel */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                    <span>🩺</span> Patient Clinical File
                  </h2>
                  <p className="text-xs text-[#64748B]">Clinical vitals, demographics, and visit notes</p>
                </div>

                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  ID: #{selectedAppointment?._id?.slice(-6) || 'PT-10024'}
                </span>
              </div>

              {selectedAppointment ? (
                <div className="space-y-4">
                  {/* Basic Demographics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[#64748B] text-[10px] uppercase font-bold">Patient Name</span>
                      <p className="font-bold text-[#0F172A] text-sm">
                        {selectedAppointment.userData?.name || selectedAppointment.patientName || 'Edward Vincent'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[#64748B] text-[10px] uppercase font-bold">Age / Gender</span>
                      <p className="font-bold text-[#0F172A] text-sm">
                        {selectedAppointment.userData?.age || selectedAppointment.age || '45'} yrs • Male
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[#64748B] text-[10px] uppercase font-bold">Blood Group</span>
                      <p className="font-bold text-rose-600 text-sm">O+ Positive</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[#64748B] text-[10px] uppercase font-bold">Contact Phone</span>
                      <p className="font-bold text-blue-700 text-sm">
                        {selectedAppointment.userData?.phone || selectedAppointment.patientPhone || '+91 98765 43210'}
                      </p>
                    </div>
                  </div>

                  {/* Vitals Snapshot */}
                  <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-blue-900 font-bold text-[10px] uppercase">Blood Pressure</span>
                      <p className="font-black text-blue-950 text-sm">120/80 mmHg</p>
                    </div>
                    <div>
                      <span className="text-blue-900 font-bold text-[10px] uppercase">Pulse Rate</span>
                      <p className="font-black text-blue-950 text-sm">74 bpm</p>
                    </div>
                    <div>
                      <span className="text-blue-900 font-bold text-[10px] uppercase">Body Temp</span>
                      <p className="font-black text-blue-950 text-sm">98.6 °F</p>
                    </div>
                    <div>
                      <span className="text-blue-900 font-bold text-[10px] uppercase">SpO2 Oxygen</span>
                      <p className="font-black text-blue-950 text-sm">99%</p>
                    </div>
                  </div>

                  {/* Chief Complaint / Notes */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Chief Complaint / Intake Reason:</span>
                    <p className="text-slate-700 font-medium">
                      {selectedAppointment.condition || 'General health evaluation, recurring headaches, and follow-up on routine blood panel.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-[#64748B] bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  Select a patient from the queue to review their medical file.
                </div>
              )}
            </div>

            {/* 6. Digital Prescription Section (Interactive Rx Writer) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                    <span className="text-blue-600">💊</span> Digital Prescription & Clinical Notes (Rx)
                  </h2>
                  <p className="text-xs text-[#64748B]">Issue signed electronic prescription and treatment protocol</p>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Rx #DOC-9924
                </span>
              </div>

              <form onSubmit={handleSubmitPrescription} className="space-y-4">
                {/* Clinical Diagnosis Input */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-[#0F172A] block uppercase tracking-wider text-[11px]">
                    Clinical Diagnosis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute Viral Pharyngitis / Seasonal Allergies"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>

                {/* Medicines List Editor */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">
                      Prescribed Medications (Rx)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedicine}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Add Drug</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {medicines.map((med, index) => (
                      <div
                        key={med.id}
                        className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 grid grid-cols-12 gap-2 items-center text-xs"
                      >
                        <span className="col-span-1 text-center font-bold text-slate-400">{index + 1}.</span>
                        
                        <input
                          type="text"
                          placeholder="Medicine Name (e.g. Amoxicillin 500mg)"
                          value={med.name}
                          onChange={(e) => handleUpdateMedicine(med.id, 'name', e.target.value)}
                          className="col-span-4 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 text-xs outline-none"
                        />

                        <input
                          type="text"
                          placeholder="Dosage (1 Tab)"
                          value={med.dosage}
                          onChange={(e) => handleUpdateMedicine(med.id, 'dosage', e.target.value)}
                          className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 text-xs outline-none"
                        />

                        <select
                          value={med.frequency}
                          onChange={(e) => handleUpdateMedicine(med.id, 'frequency', e.target.value)}
                          className="col-span-3 px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 text-xs outline-none"
                        >
                          <option value="OD (1x a day)">OD (1x a day)</option>
                          <option value="BD (2x a day)">BD (2x a day)</option>
                          <option value="TDS (3x a day)">TDS (3x a day)</option>
                          <option value="QID (4x a day)">QID (4x a day)</option>
                          <option value="SOS (When needed)">SOS (When needed)</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Duration"
                          value={med.duration}
                          onChange={(e) => handleUpdateMedicine(med.id, 'duration', e.target.value)}
                          className="col-span-1 px-1.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 text-xs outline-none text-center"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(med.id)}
                          className="col-span-1 text-center text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                          title="Remove Medicine"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dietary Advice & Clinical Notes */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-[#0F172A] block uppercase tracking-wider text-[11px]">
                    Clinical Advice & Lifestyle Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Ensure adequate oral hydration (2.5L water/day), light diet, rest for 48 hours. Follow up in clinic if symptoms persist after 5 days."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-none"
                  ></textarea>
                </div>

                {/* Submit Rx CTA */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">🔒 Secure e-Prescription</span>
                    <span>• Cryptographically signed by practitioner</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRx || !selectedAppointment}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isSubmittingRx ? 'Signing Rx...' : 'Sign & Issue Prescription ✓'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
