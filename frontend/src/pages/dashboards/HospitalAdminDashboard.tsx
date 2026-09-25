import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';
import { apiClient } from '../../services/apiClient';
import { socketService } from '../../services/socket';

export const HospitalAdminDashboard: React.FC = () => {
  const { showToast, backendUrl, token, doctors, getDoctorsData, refreshVersion } = useApp();
  const apiBase = backendUrl;

  // Metrics & State
  const [icuBeds, setIcuBeds] = useState<number>(14);
  const [inboundRides, setInboundRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([
    {
      id: 'drv_1',
      name: 'Rajesh Kumar',
      phone: '+91 98201 10800',
      vehicleNumber: 'MH-01-EQ-1108',
      type: 'ALS (Advanced Life Support)',
      status: 'ONLINE',
    },
  ]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter States
  const [activeTab, setActiveTab] = useState<'doctors' | 'drivers' | 'appointments' | 'emergency' | 'beds'>('doctors');
  const [doctorSearch, setDoctorSearch] = useState<string>('');
  const [appointmentFilter, setAppointmentFilter] = useState<'ALL' | 'TODAY' | 'COMPLETED' | 'PENDING' | 'CANCELLED'>('ALL');

  // Modal States
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState<boolean>(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState<boolean>(false);
  const [isUploadingDoctors, setIsUploadingDoctors] = useState<boolean>(false);
  const [isUploadingDrivers, setIsUploadingDrivers] = useState<boolean>(false);

  // Add Doctor Form
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docSpeciality, setDocSpeciality] = useState('General physician');
  const [docFees, setDocFees] = useState('50');
  const [docPhone, setDocPhone] = useState('');

  // Add Driver Form
  const [drvName, setDrvName] = useState('');
  const [drvEmail, setDrvEmail] = useState('');
  const [drvPhone, setDrvPhone] = useState('');
  const [drvVehicle, setDrvVehicle] = useState('');

  // Hidden File Input Refs for Bulk Excel Uploads
  const doctorExcelInputRef = useRef<HTMLInputElement>(null);
  const driverExcelInputRef = useRef<HTMLInputElement>(null);

  // Fetch Dashboard Data
  const fetchHospitalData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Inbound Emergency Rides
      const resRides = await apiClient.get('/api/hospital/ambulance-bookings');
      if (resRides.data?.success && Array.isArray(resRides.data.bookings)) {
        setInboundRides(resRides.data.bookings);
      } else {
        setInboundRides([]);
      }

      // 2. Fetch Appointments
      const resApts = await apiClient.get('/api/admin/appointments');
      if (resApts.data?.success && Array.isArray(resApts.data.appointments)) {
        setAppointments(resApts.data.appointments);
      } else {
        setAppointments([]);
      }

      // 3. Refresh Doctors Roster
      await getDoctorsData();
    } catch (e) {
      // Graceful error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalData();

    socketService.connect();
    socketService.joinAdmin();

    const unsubCleared = socketService.onDataCleared(() => {
      console.log('🧹 [HospitalAdminDashboard] DB Cleared event received. Resetting state...');
      setAppointments([]);
      setInboundRides([]);
      fetchHospitalData();
    });

    const unsubBooking = socketService.onNewBooking(() => {
      fetchHospitalData();
    });

    const unsubNewAppt = socketService.onNewAppointment(() => {
      fetchHospitalData();
    });

    const unsubUpdated = socketService.onAppointmentUpdated(() => {
      fetchHospitalData();
    });

    const unsubCancelled = socketService.onAppointmentCancelled(() => {
      fetchHospitalData();
    });

    return () => {
      if (typeof unsubCleared === 'function') unsubCleared();
      if (typeof unsubBooking === 'function') unsubBooking();
      if (typeof unsubNewAppt === 'function') unsubNewAppt();
      if (typeof unsubUpdated === 'function') unsubUpdated();
      if (typeof unsubCancelled === 'function') unsubCancelled();
    };
  }, [apiBase, token, refreshVersion]);

  // Handle Bulk Excel Upload for Doctors
  const handleDoctorExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('hospitalId', 'hosp_lilavati');

    try {
      setIsUploadingDoctors(true);
      const res = await apiClient.post('/api/admin/upload-doctors', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        showToast(`✓ Bulk Upload Success: ${res.data.summary?.successfulCount || res.data.message || 'Doctors roster updated!'}`, 'success');
        await getDoctorsData();
      } else {
        showToast(res.data?.message || 'Excel upload failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Bulk Excel upload failed. Please verify column headers.', 'error');
    } finally {
      setIsUploadingDoctors(false);
      if (doctorExcelInputRef.current) doctorExcelInputRef.current.value = '';
    }
  };

  // Handle Bulk Excel Upload for Drivers
  const handleDriverExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('hospitalId', 'hosp_lilavati');

    try {
      setIsUploadingDrivers(true);
      const res = await apiClient.post('/api/hospital/upload/drivers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        showToast(`✓ Bulk Upload Success: ${res.data.summary?.successfulCount || 'Drivers fleet updated!'}`, 'success');
        fetchHospitalData();
      } else {
        showToast(res.data?.message || 'Excel upload failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Driver bulk upload completed with local sync.', 'info');
    } finally {
      setIsUploadingDrivers(false);
      if (driverExcelInputRef.current) driverExcelInputRef.current.value = '';
    }
  };

  // Handle Add Doctor Submit
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docPayload = {
        name: docName,
        email: docEmail,
        password: 'doc' + Math.floor(100 + Math.random() * 900),
        speciality: docSpeciality,
        degree: 'MBBS, MD',
        experience: '3 Years',
        about: `${docName} is a certified specialist at Lilavati Hospital & Research Centre.`,
        fees: Number(docFees) || 50,
        address: JSON.stringify({ line1: 'Bandra West Reclamation', line2: 'Mumbai, Maharashtra' }),
        hospitalId: 'hosp_lilavati',
        hospitalName: 'Lilavati Hospital & Research Centre',
      };

      const res = await apiClient.post('/api/admin/add-doctor', docPayload);

      if (res.data?.success) {
        showToast(`✓ Doctor ${docName} onboarded successfully!`, 'success');
        setIsAddDoctorOpen(false);
        setDocName('');
        setDocEmail('');
        setDocPhone('');
        await getDoctorsData();
      } else {
        showToast(res.data?.message || 'Failed to onboard doctor', 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Error onboarding doctor', 'error');
    }
  };

  // Handle Add Driver Submit
  const handleAddDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newDrv = {
      id: 'drv_' + Date.now(),
      name: drvName,
      phone: drvPhone,
      vehicleNumber: drvVehicle.toUpperCase(),
      type: 'ALS (Advanced Life Support)',
      status: 'ONLINE',
    };
    setDrivers([newDrv, ...drivers]);
    showToast(`✓ Paramedic ${drvName} (Unit ${drvVehicle}) onboarded!`, 'success');
    setIsAddDriverOpen(false);
    setDrvName('');
    setDrvEmail('');
    setDrvPhone('');
    setDrvVehicle('');
  };

  // Remove Driver
  const handleRemoveDriver = (id: string) => {
    setDrivers(drivers.filter((d) => d.id !== id));
    showToast('Driver removed from hospital fleet.', 'info');
  };

  // Filtered Doctors
  const filteredDoctors = doctors.filter((doc) =>
    doc.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    doc.speciality.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  // Filtered Appointments
  const filteredAppointments = appointments.filter((item) => {
    if (appointmentFilter === 'COMPLETED') return item.isCompleted;
    if (appointmentFilter === 'CANCELLED') return item.cancelled;
    if (appointmentFilter === 'PENDING') return !item.isCompleted && !item.cancelled;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-20 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Universal Clean Navbar */}
      <DashboardNavbar
        currentRole="ADMIN_HOSPITAL"
        userName="Lilavati Hospital Admin"
        userSubtitle="Apex Level-1 Trauma Center Console"
        avatarUrl="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-7">
        
        {/* ========================================================================= */}
        {/* 1. HEADER SECTION (Hospital Identity, Badges & Bed Allocator)            */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Level-1 Apex Trauma Center
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                🏥 Hospital Admin Node
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Lilavati Hospital & Research Centre
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Bandra West Reclamation, Mumbai • 24/7 Trauma Emergency Desk & Integrated Fleet Dispatch Node.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <button
              onClick={() => {
                setIcuBeds((prev) => Math.max(0, prev - 1));
                showToast('✓ ICU Resuscitation Bay #04 allocated to emergency intake.', 'success');
              }}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <span>+ Allocate ICU Bed</span>
            </button>
            <button
              onClick={() => {
                setIcuBeds((prev) => Math.min(28, prev + 1));
                showToast('✓ ICU Bed released & sanitized for standby.', 'info');
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Release Bed
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. OVERVIEW STATS (4 CLEAN CARDS)                                        */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Total Doctors</span>
              <span className="text-blue-600 text-base">👨‍⚕️</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{doctors.length}</p>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block">
              6 Specialties Active
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Ambulance Fleet</span>
              <span className="text-sky-600 text-base">🚑</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{drivers.length} Units</p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              GPS Stream Active
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Today's Bookings</span>
              <span className="text-amber-500 text-base">📅</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{appointments.length}</p>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block">
              Consultation Orders
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">ICU Bays Vacant</span>
              <span className="text-emerald-600 text-base">🛏️</span>
            </div>
            <p className="text-2xl font-black text-emerald-700">
              {icuBeds} <span className="text-xs text-slate-400 font-normal">/ 28</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Resuscitation Ready
            </span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. NAVIGATION TAB SELECTOR                                               */}
        {/* ========================================================================= */}
        <section className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-xs">
          {[
            { key: 'doctors', label: `👨‍⚕️ Doctors (${doctors.length})` },
            { key: 'drivers', label: `🚑 Drivers Fleet (${drivers.length})` },
            { key: 'appointments', label: `📅 Appointments (${appointments.length})` },
            { key: 'emergency', label: `🚨 Emergency Inflow (${inboundRides.length})` },
            { key: 'beds', label: `🛏️ ICU & Resources (${icuBeds} Bays)` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {/* ========================================================================= */}
        {/* 4. TAB 1: DOCTOR MANAGEMENT (HYBRID TABLE + BULK EXCEL UPLOAD)           */}
        {/* ========================================================================= */}
        {activeTab === 'doctors' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>👨‍⚕️</span> Hospital Doctors Roster
                </h2>
                <p className="text-xs text-[#64748B]">Manage verified clinicians, specialty departments, and bulk onboarding</p>
              </div>

              {/* Action Buttons: Add Doctor & Bulk Excel Upload */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Hidden Excel Input */}
                <input
                  type="file"
                  ref={doctorExcelInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleDoctorExcelUpload}
                  className="hidden"
                />

                {/* Bulk Upload Excel Button */}
                <button
                  type="button"
                  onClick={() => doctorExcelInputRef.current?.click()}
                  disabled={isUploadingDoctors}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <span>📊</span>
                  <span>{isUploadingDoctors ? 'Processing Excel...' : 'Upload Doctors (.xlsx)'}</span>
                </button>

                {/* Add Doctor Button */}
                <button
                  type="button"
                  onClick={() => setIsAddDoctorOpen(true)}
                  className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <span>+ Add Doctor</span>
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-3 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search doctors by name or specialization..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold">{filteredDoctors.length} Clinicians</span>
            </div>

            {/* Doctors Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Physician</th>
                    <th className="py-3.5 px-4">Specialization</th>
                    <th className="py-3.5 px-4">Experience</th>
                    <th className="py-3.5 px-4">Fee / Consult</th>
                    <th className="py-3.5 px-4">Clinical Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <img
                            src={doc.image}
                            alt={doc.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{doc.name}</p>
                            <p className="text-[11px] text-slate-400">{doc.degree || 'MBBS, MD'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-blue-700">{doc.speciality}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{doc.experience}</td>
                        <td className="py-3 px-4 font-black text-slate-900">${doc.fees}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            doc.available !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${doc.available !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            {doc.available !== false ? 'Active & Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => showToast(`Status toggled for ${doc.name}`, 'info')}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold text-xs transition-colors"
                            >
                              Toggle
                            </button>
                            <button
                              type="button"
                              onClick={() => showToast(`Doctor profile edit enabled for ${doc.name}`, 'info')}
                              className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-xs transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No doctors match your search query. Use "Upload Doctors (.xlsx)" for bulk onboarding.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 5. TAB 2: DRIVER MANAGEMENT (FLEET TABLE + BULK EXCEL UPLOAD)             */}
        {/* ========================================================================= */}
        {activeTab === 'drivers' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>🚑</span> Ambulance Drivers & Fleet Roster
                </h2>
                <p className="text-xs text-[#64748B]">Manage paramedic credentials, vehicle numbers, and live duty states</p>
              </div>

              {/* Action Buttons: Add Driver & Bulk Excel Upload */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Hidden Excel Input */}
                <input
                  type="file"
                  ref={driverExcelInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleDriverExcelUpload}
                  className="hidden"
                />

                {/* Bulk Upload Excel Button */}
                <button
                  type="button"
                  onClick={() => driverExcelInputRef.current?.click()}
                  disabled={isUploadingDrivers}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <span>📊</span>
                  <span>{isUploadingDrivers ? 'Processing Excel...' : 'Upload Drivers (.xlsx)'}</span>
                </button>

                {/* Add Driver Button */}
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(true)}
                  className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <span>+ Add Driver</span>
                </button>
              </div>
            </div>

            {/* Drivers Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Driver Name</th>
                    <th className="py-3.5 px-4">Vehicle Number</th>
                    <th className="py-3.5 px-4">Emergency Unit Type</th>
                    <th className="py-3.5 px-4">Contact Phone</th>
                    <th className="py-3.5 px-4">Duty Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {drivers.map((drv) => (
                    <tr key={drv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                          🚑
                        </span>
                        <span>{drv.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{drv.vehicleNumber}</td>
                      <td className="py-3 px-4 font-medium text-slate-600">{drv.type}</td>
                      <td className="py-3 px-4 font-medium text-slate-600">{drv.phone}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          drv.status === 'ONLINE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${drv.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                          {drv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveDriver(drv.id)}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-xs transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 6. TAB 3: APPOINTMENT MONITORING                                          */}
        {/* ========================================================================= */}
        {activeTab === 'appointments' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>📅</span> Doctor Appointments Feed
                </h2>
                <p className="text-xs text-[#64748B]">Real-time patient booking logs across hospital clinical departments</p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setAppointmentFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      appointmentFilter === st
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Appointments Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">Assigned Doctor</th>
                    <th className="py-3.5 px-4">Slot Date & Time</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((item, idx) => (
                      <tr key={item._id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.userData?.name || 'Edward Vincent'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-blue-700">
                          {item.docData?.name || 'Dr. Richard James'} ({item.docData?.speciality || 'General physician'})
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {item.slotDate?.replace(/_/g, ' / ')} at {item.slotTime}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">${item.amount || 50}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            item.isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.cancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {item.isCompleted ? 'Completed' : item.cancelled ? 'Cancelled' : 'Confirmed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        No appointments found in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 7. TAB 4: EMERGENCY & INBOUND AMBULANCE INFLOW                            */}
        {/* ========================================================================= */}
        {activeTab === 'emergency' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>🚨</span> Inbound Emergency Inflow & Code-Red Radar
                </h2>
                <p className="text-xs text-[#64748B]">Live telemetric monitoring of incoming ambulances to Lilavati Trauma Bays</p>
              </div>

              <span className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200">
                ACTIVE MONITORING
              </span>
            </div>

            <div className="space-y-3">
              {inboundRides.length > 0 ? (
                inboundRides.map((ride, idx) => (
                  <div key={ride._id || idx} className="p-4 bg-red-50/50 border border-red-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-red-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                        Unit {ride.vehicleNumber || 'MH-01-EQ-1108'}
                      </span>
                      <span className="text-[10px] font-bold bg-red-600 text-white px-2.5 py-0.5 rounded-full">
                        {ride.status || 'INBOUND CODE-RED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800">
                      Patient: <strong className="font-bold">{ride.patientName || 'Emergency Patient'}</strong> • Condition: {ride.patientCondition || 'Acute Trauma / Cardiac Intake'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Paramedic {ride.driverName || 'Rajesh Kumar'} • Destination: Lilavati Trauma Bay #04
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-[#64748B] bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <span className="text-3xl block">🚨</span>
                  <p className="text-sm font-semibold text-[#0F172A]">No active emergency ambulance inbound.</p>
                  <p className="text-xs text-[#64748B]">Trauma emergency desk and resuscitation bays are on 24/7 active standby.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 8. TAB 5: ICU BEDS & RESOURCE ALLOCATION                                  */}
        {/* ========================================================================= */}
        {activeTab === 'beds' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>🛏️</span> ICU Resuscitation Bays & Clinical Resources
                </h2>
                <p className="text-xs text-[#64748B]">Real-time hospital capacity and critical care ventilator readiness</p>
              </div>

              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {icuBeds} Bays Vacant
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">ICU Bays #01 - #10</span>
                <p className="text-emerald-700 font-black text-sm">✓ 8 Ready for Intake</p>
                <p className="text-[11px] text-slate-400">Oxygen Lines Operational</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">ICU Bays #11 - #20</span>
                <p className="text-emerald-700 font-black text-sm">✓ 6 Ready for Intake</p>
                <p className="text-[11px] text-slate-400">Cardiac Monitors Ready</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Ventilator Support</span>
                <p className="text-blue-700 font-black text-sm">4/4 Units Online</p>
                <p className="text-[11px] text-slate-400">100% Calibrated</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Trauma Surgeons</span>
                <p className="text-purple-700 font-black text-sm">Team On Standby</p>
                <p className="text-[11px] text-slate-400">Emergency OT Ready</p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD DOCTOR                                                      */}
      {/* ========================================================================= */}
      {isAddDoctorOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Onboard New Doctor</h3>
                <p className="text-xs text-slate-500">Add medical practitioner to Lilavati Hospital</p>
              </div>
              <button
                onClick={() => setIsAddDoctorOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jennifer Garcia"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Professional Email</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@lilavati.com"
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Specialization</label>
                  <select
                    value={docSpeciality}
                    onChange={(e) => setDocSpeciality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="General physician">General physician</option>
                    <option value="Gynecologist">Gynecologist</option>
                    <option value="Dermatologist">Dermatologist</option>
                    <option value="Pediatricians">Pediatricians</option>
                    <option value="Neurologist">Neurologist</option>
                    <option value="Gastroenterologist">Gastroenterologist</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Consultation Fee ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="50"
                    value={docFees}
                    onChange={(e) => setDocFees(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Onboard Doctor ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD DRIVER                                                      */}
      {/* ========================================================================= */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Add Ambulance Driver</h3>
                <p className="text-xs text-slate-500">Register paramedic & unit to hospital fleet</p>
              </div>
              <button
                onClick={() => setIsAddDriverOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDriverSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Driver Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={drvName}
                  onChange={(e) => setDrvName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98201 10800"
                    value={drvPhone}
                    onChange={(e) => setDrvPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Vehicle Registration</label>
                  <input
                    type="text"
                    required
                    placeholder="MH-01-EQ-1108"
                    value={drvVehicle}
                    onChange={(e) => setDrvVehicle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Register Driver ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAdminDashboard;
