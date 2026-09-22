import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { adminAPI } from '../api';
import {
  Building2,
  HeartPulse,
  UserCheck,
  Truck,
  AlertTriangle,
  Calendar,
  Activity,
  Bed,
} from 'lucide-react';

export const HospitalAdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHospitalData = async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getHospitalStats();
        setData(res.data);
      } catch (err) {
        console.error('Error fetching hospital admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitalData();
  }, []);

  const stats = data?.stats;
  const hospital = data?.hospital;
  const doctors = data?.doctors || [];
  const ambulances = data?.ambulances || [];
  const activeEmergencies = data?.activeEmergencies || [];
  const recentAppointments = data?.recentAppointments || [];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Hospital Banner */}
          <div className="bg-white rounded-3xl p-6 border border-surface-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-soft">
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
              <span className="text-xs font-bold text-surface-700 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ER Level 1 Trauma Active
              </span>
            </div>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Available Beds"
              value={`${stats?.availableBeds || 34} / ${stats?.totalBeds || 180}`}
              subtitle="ER & General Ward"
              icon={Bed}
              color="emerald"
            />
            <StatCard
              title="ICU Beds Available"
              value={stats?.icuBedsAvailable || 8}
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
              value={`${stats?.onlineAmbulances || 0} Online / ${stats?.totalAmbulances || ambulances.length}`}
              subtitle="Rapid Dispatch Fleet"
              icon={Truck}
              color="amber"
            />
          </div>

          {/* Live Emergency Admissions Feed */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                Live Emergency Incoming Triage ({activeEmergencies.length})
              </h3>
            </div>

            {activeEmergencies.length > 0 ? (
              <div className="divide-y divide-surface-100">
                {activeEmergencies.map((em: any) => (
                  <div key={em._id} className="p-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        🚨
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-surface-900">{em.patientId?.name || 'Emergency Patient'}</span>
                          <Badge variant={em.isSOS ? 'emergency' : 'primary'} dot>
                            {em.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-surface-500 mt-0.5">
                          Condition: {em.patientCondition} • Assigned Driver: {em.driverId?.name || 'Searching...'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                      ETA: ~{em.etaMinutes || 5} min
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
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-5 space-y-4">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Specialist Doctors on Staff ({doctors.length})
              </h3>
              <div className="divide-y divide-surface-100 max-h-72 overflow-y-auto">
                {doctors.map((d: any) => (
                  <div key={d._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={d.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.userId?.name || 'Dr')}&background=2563EB&color=fff`}
                        alt="Doc"
                        className="w-9 h-9 rounded-xl object-cover border border-surface-200"
                      />
                      <div>
                        <p className="text-xs font-bold text-surface-900">{d.userId?.name}</p>
                        <p className="text-[11px] text-surface-500">{d.specialization}</p>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Ambulance Fleet Table */}
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-5 space-y-4">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Hospital Ambulance Fleet ({ambulances.length})
              </h3>
              <div className="divide-y divide-surface-100 max-h-72 overflow-y-auto">
                {ambulances.map((a: any) => (
                  <div key={a._id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-surface-900">{a.vehicleNumber}</p>
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
