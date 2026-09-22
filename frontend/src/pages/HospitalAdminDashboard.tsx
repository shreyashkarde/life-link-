import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { adminAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  HeartPulse,
  UserCheck,
  Truck,
  AlertTriangle,
  Calendar,
  Activity,
  Bed,
  Radio,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';

export const HospitalAdminDashboard: React.FC = () => {
  const { socket } = useSocket();
  const { addToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([]);
  const [availableBeds, setAvailableBeds] = useState(34);
  const [icuBeds, setIcuBeds] = useState(8);

  const fetchHospitalData = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getHospitalStats();
      setData(res.data);
      if (res.data?.activeEmergencies) {
        setActiveEmergencies(res.data.activeEmergencies);
      }
      if (res.data?.stats?.availableBeds) {
        setAvailableBeds(res.data.stats.availableBeds);
      }
      if (res.data?.stats?.icuBedsAvailable) {
        setIcuBeds(res.data.stats.icuBedsAvailable);
      }
    } catch (err) {
      console.error('Error fetching hospital admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalData();
  }, []);

  // Real-time socket integration for hospital emergency room
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_hospital');

    const handleHospitalAlert = (emergencyData: any) => {
      console.log('[Socket] Hospital emergency alert received:', emergencyData);
      setActiveEmergencies((prev) => [emergencyData, ...prev]);
      addToast(
        'error',
        `🚨 CODE RED EMERGENCY: Incoming Patient ${emergencyData.patientId?.name || ''} via ALS unit!`,
        'Trauma Alert'
      );
    };

    const handleIncomingAmbulance = (booking: any) => {
      console.log('[Socket] Incoming ambulance dispatched:', booking);
      setActiveEmergencies((prev) => [booking, ...prev]);
      addToast('warning', '🚑 New ambulance dispatch en route to hospital trauma bay.');
    };

    const handleBedSync = (bedData: any) => {
      if (typeof bedData.availableBeds === 'number') setAvailableBeds(bedData.availableBeds);
      if (typeof bedData.icuBeds === 'number') setIcuBeds(bedData.icuBeds);
    };

    socket.on('emergency:hospitalAlert', handleHospitalAlert);
    socket.on('hospital:incomingAmbulance', handleIncomingAmbulance);
    socket.on('hospital:bedSync', handleBedSync);

    return () => {
      socket.off('emergency:hospitalAlert', handleHospitalAlert);
      socket.off('hospital:incomingAmbulance', handleIncomingAmbulance);
      socket.off('hospital:bedSync', handleBedSync);
    };
  }, [socket]);

  // Handle bed count live adjustment & socket broadcast
  const adjustBeds = (type: 'available' | 'icu', delta: number) => {
    if (type === 'available') {
      const next = Math.max(0, availableBeds + delta);
      setAvailableBeds(next);
      if (socket) {
        socket.emit('hospital:bedUpdated', { availableBeds: next, icuBeds });
      }
      addToast('info', `Hospital General Beds updated to ${next}`);
    } else {
      const next = Math.max(0, icuBeds + delta);
      setIcuBeds(next);
      if (socket) {
        socket.emit('hospital:bedUpdated', { availableBeds, icuBeds: next });
      }
      addToast('info', `Hospital ICU Beds updated to ${next}`);
    }
  };

  const stats = data?.stats;
  const hospital = data?.hospital;
  const doctors = data?.doctors || [];
  const ambulances = data?.ambulances || [];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Hospital Banner */}
          <div className="glass-card rounded-3xl p-6 border border-surface-200/80 shadow-luxury flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-2xl shadow-soft">
                🏥
              </div>
              <div>
                <h2 className="text-xl font-black text-surface-900 tracking-tight">
                  {hospital?.name || 'LifeLink Central Multi-Specialty & Trauma Center'}
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  {hospital?.address} • Emergency Hotline: {hospital?.emergencyNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ER Level 1 Trauma Active
              </span>
            </div>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Available Beds"
              value={`${availableBeds} / ${stats?.totalBeds || 180}`}
              subtitle="ER & General Ward"
              icon={Bed}
              color="emerald"
            />
            <StatCard
              title="ICU Beds Available"
              value={icuBeds}
              subtitle="Critical Care Units"
              icon={HeartPulse}
              color="rose"
            />
            <StatCard
              title="Hospital Doctors"
              value={stats?.totalDoctors || doctors.length}
              subtitle="On-duty Specialists"
              icon={UserCheck}
              color="blue"
            />
            <StatCard
              title="Assigned Ambulances"
              value={`${stats?.onlineAmbulances || 1} Online / ${stats?.totalAmbulances || ambulances.length}`}
              subtitle="Rapid Dispatch Fleet"
              icon={Truck}
              color="amber"
            />
          </div>

          {/* Real-Time Live Bed Allocation Bar */}
          <div className="glass-card rounded-3xl p-5 border border-surface-200/80 shadow-luxury flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-surface-900">Real-Time Bed Availability Synchronizer</h4>
                <p className="text-[11px] text-surface-500">
                  Update live bed counts to broadcast capacity across doctors and dispatchers instantly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* General Beds Adjuster */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-surface-700">General Beds:</span>
                <button
                  onClick={() => adjustBeds('available', -1)}
                  className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-xs font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-black text-sm text-surface-900 w-6 text-center">{availableBeds}</span>
                <button
                  onClick={() => adjustBeds('available', 1)}
                  className="w-7 h-7 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ICU Beds Adjuster */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-rose-700">ICU Units:</span>
                <button
                  onClick={() => adjustBeds('icu', -1)}
                  className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-xs font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-black text-sm text-rose-600 w-6 text-center">{icuBeds}</span>
                <button
                  onClick={() => adjustBeds('icu', 1)}
                  className="w-7 h-7 rounded-lg bg-rose-600 text-white hover:bg-rose-700 flex items-center justify-center text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Live Emergency Admissions Feed */}
          <div className="glass-card rounded-3xl border border-surface-200/80 shadow-luxury overflow-hidden">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                Live Emergency Incoming Triage ({activeEmergencies.length})
              </h3>
              <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Socket.io Live Sync Active
              </span>
            </div>

            {activeEmergencies.length > 0 ? (
              <div className="divide-y divide-surface-100">
                {activeEmergencies.map((em: any) => (
                  <div key={em._id} className="p-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg shadow-xs">
                        🚨
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-surface-900">{em.patientId?.name || 'Emergency Code Red Patient'}</span>
                          <Badge variant={em.isSOS ? 'emergency' : 'primary'} dot>
                            {em.status?.replace(/_/g, ' ') || 'ACTIVE'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-surface-500 mt-0.5 font-medium">
                          Condition: {em.patientCondition || 'Critical Resuscitation'} • Assigned Driver: {em.driverId?.name || 'En Route'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 font-mono">
                      ETA: ~{em.etaMinutes || 4} min
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-surface-400 text-xs">No critical emergencies incoming at this moment.</div>
            )}
          </div>

          {/* Doctors & Ambulances Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doctors Staff Table */}
            <div className="glass-card rounded-3xl border border-surface-200/80 shadow-luxury p-5 space-y-4">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Specialist Doctors on Staff ({doctors.length})
              </h3>
              <div className="divide-y divide-surface-100 max-h-72 overflow-y-auto">
                {doctors.map((d: any) => (
                  <div key={d._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={d.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.userId?.name || 'Dr')}&background=2563EB&color=fff&bold=true`}
                        alt="Doc"
                        className="w-9 h-9 rounded-xl object-cover border border-surface-200"
                      />
                      <div>
                        <p className="text-xs font-bold text-surface-900">{d.userId?.name}</p>
                        <p className="text-[11px] text-surface-500">{d.specialization}</p>
                      </div>
                    </div>
                    <Badge variant="success">On-Duty</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Ambulance Fleet Table */}
            <div className="glass-card rounded-3xl border border-surface-200/80 shadow-luxury p-5 space-y-4">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Hospital Ambulance Fleet ({ambulances.length})
              </h3>
              <div className="divide-y divide-surface-100 max-h-72 overflow-y-auto">
                {ambulances.map((a: any) => (
                  <div key={a._id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-surface-900 font-mono">{a.vehicleNumber}</p>
                      <p className="text-[11px] text-surface-500">{a.vehicleModel} • {a.ambulanceType}</p>
                    </div>
                    <Badge variant={a.isOnline ? 'primary' : 'neutral'} dot>
                      {a.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
