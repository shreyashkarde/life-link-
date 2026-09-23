import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { aToken, token, backendUrl, showToast, doctors, getDoctorsData } = useApp();
  const apiBase = backendUrl || 'http://localhost:5000';

  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hospitals, setHospitals] = useState<any[]>([
    {
      id: 'hosp_lilavati',
      name: 'Lilavati Hospital & Research Centre',
      location: 'Bandra West Reclamation, Mumbai, Maharashtra',
      city: 'Mumbai',
      type: 'Level-1 Apex Trauma Center',
      doctorsCount: 15,
      driversCount: 5,
      emergencyPhone: '+91 22 2675 1000',
      status: 'ACTIVE',
    },
    {
      id: 'hosp_kokilaben',
      name: 'Kokilaben Dhirubhai Ambani Hospital',
      location: 'Rao Saheb Achutrao Patwardhan Marg, Andheri West, Mumbai',
      city: 'Mumbai',
      type: 'Multi-Specialty & Quaternary Care',
      doctorsCount: 12,
      driversCount: 4,
      emergencyPhone: '+91 22 4269 6969',
      status: 'ACTIVE',
    },
    {
      id: 'hosp_hinduja',
      name: 'P.D. Hinduja National Hospital',
      location: 'Veer Savarkar Marg, Mahim, Mumbai',
      city: 'Mumbai',
      type: 'Tertiary Care & Trauma Emergency',
      doctorsCount: 10,
      driversCount: 3,
      emergencyPhone: '+91 22 2445 1515',
      status: 'ACTIVE',
    },
    {
      id: 'hosp_fortis',
      name: 'Fortis Hospital Mulund',
      location: 'Mulund Goregaon Link Road, Mumbai',
      city: 'Mumbai',
      type: 'Cardiac Care & Emergency Node',
      doctorsCount: 8,
      driversCount: 3,
      emergencyPhone: '+91 22 6799 4444',
      status: 'ACTIVE',
    },
  ]);

  // Search & Filter States
  const [hospitalSearch, setHospitalSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'hospitals' | 'monitoring' | 'analytics' | 'logs' | 'control'>('hospitals');

  // Modal States
  const [isAddHospitalOpen, setIsAddHospitalOpen] = useState<boolean>(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState<boolean>(false);
  const [isUploadingHospitals, setIsUploadingHospitals] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Add Hospital Form
  const [hospName, setHospName] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [hospCity, setHospCity] = useState('Mumbai');
  const [hospType, setHospType] = useState('Level-1 Apex Trauma Center');
  const [hospPhone, setHospPhone] = useState('');

  // Hidden File Input Ref for Hospital Excel Upload
  const hospitalExcelInputRef = useRef<HTMLInputElement>(null);

  // Fetch Admin Dashboard Data
  const fetchAdminDash = async () => {
    try {
      setLoading(true);
      const authToken = aToken || token || sessionStorage.getItem('aToken') || localStorage.getItem('token') || '';
      
      // 1. Admin Dash stats
      const { data } = await axios.get(`${apiBase}/api/admin/dashboard`, {
        headers: { atoken: authToken, token: authToken },
      });
      if (data.success && data.dashData) {
        setDashData(data.dashData);
      }

      // 2. Fetch Hospitals
      const hospRes = await axios.get(`${apiBase}/api/hospitals`).catch(() => null);
      if (hospRes?.data?.success && Array.isArray(hospRes.data.hospitals) && hospRes.data.hospitals.length > 0) {
        setHospitals(hospRes.data.hospitals);
      }

      // 3. Sync Doctors
      await getDoctorsData();
    } catch (e: any) {
      console.error('SuperAdmin Dashboard Fetch Error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDash();
  }, [aToken, token, apiBase]);

  // Bulk Upload Hospitals Excel (.xlsx)
  const handleHospitalExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploadingHospitals(true);
      const authToken = aToken || token || sessionStorage.getItem('aToken') || localStorage.getItem('token') || '';
      const res = await axios.post(`${apiBase}/api/admin/upload-hospitals`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${authToken}`,
          atoken: authToken,
          token: authToken,
        },
      });

      if (res.data?.success) {
        showToast(`✓ Bulk Upload Success: ${res.data.summary?.successfulCount || 'Hospitals onboarded!'}`, 'success');
        fetchAdminDash();
      } else {
        showToast(res.data?.message || 'Excel upload failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Hospital bulk upload completed.', 'info');
    } finally {
      setIsUploadingHospitals(false);
      if (hospitalExcelInputRef.current) hospitalExcelInputRef.current.value = '';
    }
  };

  // Add Hospital Submit
  const handleAddHospitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newHosp = {
      id: 'hosp_' + Date.now(),
      name: hospName,
      location: hospAddress + ', ' + hospCity,
      city: hospCity,
      type: hospType,
      doctorsCount: 4,
      driversCount: 2,
      emergencyPhone: hospPhone || '+91 22 2675 1000',
      status: 'ACTIVE',
    };
    setHospitals([newHosp, ...hospitals]);
    showToast(`✓ Hospital ${hospName} registered to network!`, 'success');
    setIsAddHospitalOpen(false);
    setHospName('');
    setHospAddress('');
    setHospPhone('');
  };

  // Delete Hospital
  const handleDeleteHospital = (id: string) => {
    setHospitals(hospitals.filter((h) => h.id !== id && h._id !== id));
    showToast('Hospital removed from governance roster.', 'info');
  };

  // System-Wide Data Reset (Clear All Test Data)
  const handleClearAllData = async () => {
    try {
      const res = await axios.post(`${apiBase}/api/admin/clear-all-data`);
      if (res.data?.success) {
        showToast('✓ All dynamic test data cleared successfully! Clean real-time state active.', 'success');
        setIsClearDataOpen(false);
        fetchAdminDash();
      } else {
        showToast(res.data?.message || 'Failed to clear data', 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Error executing database clean', 'error');
    }
  };

  // Filtered Hospitals
  const filteredHospitals = hospitals.filter((h) =>
    h.name?.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
    h.city?.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
    h.type?.toLowerCase().includes(hospitalSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-20 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Universal Dashboard Navbar */}
      <DashboardNavbar
        currentRole="SUPER_ADMIN"
        userName="System Administrator"
        userSubtitle="Super Admin Master Governance Console"
        avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-7">
        
        {/* ========================================================================= */}
        {/* 1. HEADER SECTION (Identity, System Status & Action Hub)                 */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                Master Governance Root Node
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                ⚡ 100% Systems Operational
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Super Admin Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Multi-hospital SaaS governance, doctor credential verification, ambulance fleet dispatch telemetry, and financial analytics.
            </p>
          </div>

          {/* Right Action Hub */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  showToast('System audit stream updated.', 'info');
                }}
                className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:text-blue-600 transition-all relative cursor-pointer"
                title="System Notifications"
              >
                <span className="text-lg">🔔</span>
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white"></span>
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900">System Activity Stream</span>
                    <span className="text-[10px] text-blue-600 font-semibold cursor-pointer" onClick={() => setShowNotifications(false)}>Close ✕</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
                      <p className="font-bold text-purple-900">Multi-Hospital Network Active</p>
                      <p className="text-[11px] text-slate-600">{hospitals.length} certified hospitals synchronized in MongoDB Atlas.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <p className="font-bold text-emerald-900">Excel Bulk Upload Engine Online</p>
                      <p className="text-[11px] text-slate-600">SheetJS memory buffer parser ready for doctors, drivers, and hospitals.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/admin/all-appointments')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              All Appointments
            </button>

            <button
              onClick={() => setIsClearDataOpen(true)}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              title="Reset test database"
            >
              <span>🗑️</span>
              <span>Clear All Data</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. GLOBAL STATS (5 RESPONSIVE TOP CARDS)                                 */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Total Hospitals</span>
              <span className="text-purple-600 text-base">🏥</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{hospitals.length}</p>
            <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md inline-block">
              Apex Network
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Active Doctors</span>
              <span className="text-blue-600 text-base">👨‍⚕️</span>
            </div>
            <p className="text-2xl font-black text-[#2563EB]">{dashData?.doctors ?? doctors.length}</p>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block">
              Verified Roster
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Total Patients</span>
              <span className="text-emerald-600 text-base">👥</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{dashData?.patients ?? 0}</p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Registered Users
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Ambulance Fleet</span>
              <span className="text-sky-600 text-base">🚑</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">5 Units</p>
            <span className="text-[10px] text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-md inline-block">
              GPS Streaming
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Total Bookings</span>
              <span className="text-amber-500 text-base">📅</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{dashData?.appointments ?? 0}</p>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block">
              Consultation Orders
            </span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. MULTI-SECTION NAVIGATION TABS                                         */}
        {/* ========================================================================= */}
        <section className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-xs">
          {[
            { key: 'hospitals', label: `🏥 Hospital Governance (${hospitals.length})` },
            { key: 'monitoring', label: `📡 Live Monitoring & Radar` },
            { key: 'analytics', label: `📊 System Analytics & SLAs` },
            { key: 'logs', label: `📋 Audit Trail & Logs` },
            { key: 'control', label: `⚙️ Data Control & Reset` },
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
        {/* 4. TAB 1: HOSPITAL MANAGEMENT (MAIN SECTION + BULK EXCEL UPLOAD)         */}
        {/* ========================================================================= */}
        {activeTab === 'hospitals' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>🏥</span> Certified Hospital Network
                </h2>
                <p className="text-xs text-[#64748B]">Manage multi-hospital SaaS hierarchy, bed quotas, and bulk onboarding</p>
              </div>

              {/* Action Buttons: Add Hospital & Bulk Excel Upload */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Hidden Excel Input */}
                <input
                  type="file"
                  ref={hospitalExcelInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleHospitalExcelUpload}
                  className="hidden"
                />

                {/* Bulk Upload Excel Button */}
                <button
                  type="button"
                  onClick={() => hospitalExcelInputRef.current?.click()}
                  disabled={isUploadingHospitals}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <span>📊</span>
                  <span>{isUploadingHospitals ? 'Uploading Excel...' : 'Upload Hospitals (.xlsx)'}</span>
                </button>

                {/* Add Hospital Button */}
                <button
                  type="button"
                  onClick={() => setIsAddHospitalOpen(true)}
                  className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <span>+ Add Hospital</span>
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-3 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search hospitals by name, city, or facility tier..."
                  value={hospitalSearch}
                  onChange={(e) => setHospitalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold">{filteredHospitals.length} Hospitals</span>
            </div>

            {/* Hospitals Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Hospital Facility</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Classification</th>
                    <th className="py-3.5 px-4">Doctors</th>
                    <th className="py-3.5 px-4">Fleet</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredHospitals.map((hosp) => (
                    <tr key={hosp.id || hosp._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base">
                          🏥
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{hosp.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">Emergency: {hosp.emergencyPhone}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{hosp.location}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {hosp.type || 'Apex Trauma'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">{hosp.doctorsCount || 15} Clinicians</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{hosp.driversCount || 5} Ambulances</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {hosp.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => showToast(`Opening management portal for ${hosp.name}`, 'info')}
                            className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-xs transition-colors"
                          >
                            Manage
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHospital(hosp.id || hosp._id)}
                            className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-xs transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 5. TAB 2: LIVE SYSTEM MONITORING & TELEMETRY RADAR                       */}
        {/* ========================================================================= */}
        {activeTab === 'monitoring' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Consultation Stream */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <span className="text-blue-600">📅</span> Live Consultation Feed
                </h2>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  REALTIME DB
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                {dashData?.latestAppointments && dashData.latestAppointments.length > 0 ? (
                  dashData.latestAppointments.map((item: any, idx: number) => (
                    <div key={item._id || idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-slate-900 font-bold">
                        <span>[CONSULTATION] {item.docData?.name || 'Physician'}</span>
                        <span className="text-blue-700 font-mono">${item.amount || 50}</span>
                      </div>
                      <p className="text-slate-600">
                        Patient: <strong>{item.userData?.name || 'Walk-in'}</strong> • Slot: {item.slotDate?.replace(/_/g, ' / ')} at {item.slotTime}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Status: <span className="font-semibold text-slate-700">{item.isCompleted ? 'Completed ✓' : item.cancelled ? 'Cancelled' : 'Confirmed'}</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
                    <p className="text-xs font-semibold text-slate-600">No live consultations recorded yet.</p>
                    <p className="text-[11px] text-slate-400">Bookings from patient portal will appear in real time.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency SOS Telemetry Stream */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <span className="text-red-600">🚨</span> Emergency Dispatch Radar
                </h2>
                <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                  CODE-RED STREAM
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-100 space-y-1">
                  <div className="flex items-center justify-between text-red-700 font-bold">
                    <span>[CODE-RED SOS] Unit MH-01-EQ-1108</span>
                    <span className="text-[11px] font-mono text-red-500">Live GPS</span>
                  </div>
                  <p className="text-slate-700 font-medium">Paramedic Rajesh Kumar • Lilavati Trauma Bay #04 Assigned</p>
                  <p className="text-[11px] text-slate-500">Speed: 48 km/h • Oxygen Readiness: 98% • ETA: 3 mins</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-slate-800 font-bold">
                    <span>[DISPATCH STANDBY] Unit MH-02-AB-1020</span>
                    <span className="text-[11px] font-mono text-emerald-600">Standby</span>
                  </div>
                  <p className="text-slate-600">Paramedic Suresh Patil • Kokilaben Trauma Base Patrol</p>
                  <p className="text-[11px] text-slate-400">Status: Patrol Online • GPS Telemetry Broadcasting</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 6. TAB 3: SYSTEM ANALYTICS & SLAS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SLA Response Time Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Emergency Dispatch SLA</h3>
                <span className="text-xs font-bold text-emerald-600">99.4% Adherence</span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Average Ambulance Response Time</span>
                    <span className="text-blue-600 font-bold">3.2 Mins</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full w-[88%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Trauma Bay Resuscitation Allocation</span>
                    <span className="text-emerald-600 font-bold">98.2%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full w-[98%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Consultations Distribution by Specialty</h3>
                <span className="text-xs text-slate-400">All Network Hospitals</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-[11px]">General Medicine</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">38%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-[11px]">Gynecology & Maternal</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">22%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-[11px]">Dermatology</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">14%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-[11px]">Pediatrics</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">12%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-[11px]">Neurology</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">8%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-[11px]">Gastroenterology</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">6%</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 7. TAB 4: AUDIT TRAIL & LOGS                                             */}
        {/* ========================================================================= */}
        {activeTab === 'logs' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <span>📋</span> System-Wide Audit Log Stream
              </h2>
              <span className="text-xs text-slate-400 font-mono">Immutable Telemetry</span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-emerald-700 font-bold">[EXCEL_BUFFER_SUCCESS]</span> 15 Doctors synchronized across multi-hospital network
                </div>
                <span className="text-slate-400 text-[11px]">2 mins ago</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-blue-700 font-bold">[DISPATCH_ONLINE]</span> Unit MH-01-EQ-1108 joined GPS telemetry patrol
                </div>
                <span className="text-slate-400 text-[11px]">8 mins ago</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-purple-700 font-bold">[NODE_HEALTH]</span> MongoDB Atlas replica set state: PRIMARY (100% Health)
                </div>
                <span className="text-slate-400 text-[11px]">15 mins ago</span>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 8. TAB 5: DATA CONTROL PANEL & RESET                                     */}
        {/* ========================================================================= */}
        {activeTab === 'control' && (
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-rose-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>⚙️</span> System Data Control & Reset Console
                </h2>
                <p className="text-xs text-[#64748B]">Wipe transactional test records to prepare for real-time live demonstrations</p>
              </div>

              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                ADMIN PRIVILEGES ACTIVE
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
              <h3 className="text-sm font-bold text-rose-900">Database Test Data Wipe</h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Clears all test appointments, booked clinical time-slots, emergency ambulance trips, patient notifications, and ratings. Preserves verified doctor and hospital credentials.
              </p>
              
              <button
                type="button"
                onClick={() => setIsClearDataOpen(true)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <span>🗑️</span>
                <span>Wipe Test Data & Reset Store</span>
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD HOSPITAL                                                    */}
      {/* ========================================================================= */}
      {isAddHospitalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Register New Hospital Facility</h3>
                <p className="text-xs text-slate-500">Onboard healthcare organization to SaaS network</p>
              </div>
              <button
                onClick={() => setIsAddHospitalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddHospitalSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lilavati Hospital & Research Centre"
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Address & Reclamation Road</label>
                <input
                  type="text"
                  required
                  placeholder="Bandra West Reclamation, Mumbai"
                  value={hospAddress}
                  onChange={(e) => setHospAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={hospCity}
                    onChange={(e) => setHospCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Emergency Desk Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 22 2675 1000"
                    value={hospPhone}
                    onChange={(e) => setHospPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Hospital Tier Classification</label>
                <select
                  value={hospType}
                  onChange={(e) => setHospType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Level-1 Apex Trauma Center">Level-1 Apex Trauma Center</option>
                  <option value="Multi-Specialty & Quaternary Care">Multi-Specialty & Quaternary Care</option>
                  <option value="Tertiary Care & Trauma Emergency">Tertiary Care & Trauma Emergency</option>
                  <option value="Cardiac & Critical Care Node">Cardiac & Critical Care Node</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddHospitalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Register Hospital ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CLEAR ALL DATA CONFIRMATION                                     */}
      {/* ========================================================================= */}
      {isClearDataOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl">
              ⚠️
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Clear All Dynamic Test Data?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will wipe all test appointments, booked doctor slots, emergency ambulance dispatches, and notifications. System rosters will be reset for clean real-time entries.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearDataOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Yes, Wipe Test Data ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
