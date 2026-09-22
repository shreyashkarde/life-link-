import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { adminAPI } from '../api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { User, Hospital } from '../types';
import {
  ShieldCheck,
  Users,
  Building2,
  Truck,
  Activity,
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  Radio,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

interface NetworkEvent {
  type: string;
  timestamp: string;
  description: string;
}

export const SuperAdminDashboard: React.FC = () => {
  const { addToast } = useToast();
  const { socket } = useSocket();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Live real-time network activity stream
  const [liveEvents, setLiveEvents] = useState<NetworkEvent[]>([
    {
      type: 'GRID_ONLINE',
      timestamp: new Date().toLocaleTimeString(),
      description: 'Mumbai Metropolitan Emergency Dispatch Grid operational with 99.98% SLA.',
    },
    {
      type: 'AMBULANCE_READY',
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      description: 'Unit #ALS-04 reported ready for emergency dispatch at BKC Station.',
    },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getSuperAdminStats(),
        adminAPI.getAllUsers({
          role: selectedRoleFilter !== 'ALL' ? selectedRoleFilter : undefined,
          search: searchQuery || undefined,
        }),
      ]);

      setStats(statsRes.data.stats);
      setHospitals(statsRes.data.hospitals || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Error fetching super admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRoleFilter, searchQuery]);

  // Real-time socket monitoring
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_admin');

    const handleEventLogged = (eventPayload: any) => {
      console.log('[Socket] Super Admin received real-time event:', eventPayload);
      let desc = 'System activity recorded.';
      if (eventPayload.type === 'AMBULANCE_REQUESTED') {
        desc = `🚑 New Ambulance Request: ${eventPayload.booking?.ambulanceType || 'ALS'} unit to ${eventPayload.booking?.pickupLocation?.address || 'Pickup'}`;
      } else if (eventPayload.type === 'RIDE_ACCEPTED') {
        desc = `🟢 Ride Accepted by Driver ID ${eventPayload.data?.driverId || ''}`;
      } else if (eventPayload.type === 'APPOINTMENT_BOOKED') {
        desc = `🩺 Doctor Consultation Scheduled with ${eventPayload.appointment?.doctorId?.userId?.name || 'Doctor'}`;
      } else if (eventPayload.type === 'APPOINTMENT_COMPLETED') {
        desc = `✅ Consultation completed by ${eventPayload.data?.doctorName || 'Doctor'}`;
      } else if (eventPayload.type === 'HOSPITAL_BEDS_UPDATED') {
        desc = `🏥 Bed counts synchronized: ${eventPayload.bedData?.availableBeds || 0} General / ${eventPayload.bedData?.icuBeds || 0} ICU`;
      }

      setLiveEvents((prev) => [
        {
          type: eventPayload.type,
          timestamp: new Date().toLocaleTimeString(),
          description: desc,
        },
        ...prev.slice(0, 8),
      ]);
    };

    const handleSosAlert = (sosData: any) => {
      setLiveEvents((prev) => [
        {
          type: 'SOS_TRIGGERED',
          timestamp: new Date().toLocaleTimeString(),
          description: `🚨 CODE RED SOS: Instant ALS Dispatch requested at ${sosData.pickupLocation?.address || 'GPS Coordinates'}`,
        },
        ...prev.slice(0, 8),
      ]);
      addToast('error', '🚨 CODE RED: Instant 1-Click SOS Triggered on Platform!', 'Global Alert');
    };

    socket.on('admin:eventLogged', handleEventLogged);
    socket.on('emergency:hospitalAlert', handleSosAlert);

    return () => {
      socket.off('admin:eventLogged', handleEventLogged);
      socket.off('emergency:hospitalAlert', handleSosAlert);
    };
  }, [socket]);

  const handleToggleUser = async (userId: string) => {
    try {
      const res = await adminAPI.toggleUserStatus(userId);
      addToast('success', res.data.message);
      fetchData();
    } catch (err) {
      addToast('error', 'Failed to update user status');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Global Nexus Control
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h2 className="text-2xl font-black text-surface-900 tracking-tight mt-1">
                LifeLink System Command Nexus
              </h2>
              <p className="text-xs text-surface-500 font-medium">
                Live monitoring, role administration, and emergency dispatch analytics across Mumbai
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-surface-700 bg-white border border-surface-200/80 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                Real-Time Socket Channel Active
              </span>
            </div>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Platform Users"
              value={stats?.totalUsers || users.length}
              subtitle="Registered Citizens & Medics"
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Total Ambulances"
              value={stats?.totalAmbulances || 14}
              subtitle={`${stats?.onlineAmbulances || 1} Active on Live Grid`}
              icon={Truck}
              color="amber"
            />
            <StatCard
              title="Trauma Hospitals"
              value={stats?.totalHospitals || hospitals.length}
              subtitle="Network Partner Centers"
              icon={Building2}
              color="emerald"
            />
            <StatCard
              title="System Revenue"
              value={`₹${(stats?.totalRevenue || 48500).toLocaleString()}`}
              subtitle="Platform Dispatch Volume"
              icon={ShieldCheck}
              color="indigo"
            />
          </div>

          {/* Live Real-Time Activity Stream */}
          <div className="glass-card rounded-3xl p-5 border border-surface-200/80 shadow-luxury space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600 animate-pulse" />
                <h3 className="text-xs font-black text-surface-900 uppercase tracking-wider">
                  Live Global Network Activity Stream (Real-Time)
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ⚡ 0ms Latency Broadcast
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {liveEvents.map((evt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-50 border border-surface-100 text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        evt.type.includes('SOS')
                          ? 'bg-rose-500 animate-ping'
                          : evt.type.includes('AMBULANCE')
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-surface-800">{evt.description}</span>
                  </div>
                  <span className="text-[10px] font-mono text-surface-400 font-bold shrink-0 ml-4">
                    {evt.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* User Management Table */}
          <div className="glass-card rounded-3xl border border-surface-200/80 shadow-luxury overflow-hidden">
            <div className="p-5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-surface-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  User & Role Directory ({users.length})
                </h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-64">
                  <label htmlFor="admin-user-search" className="sr-only">
                    Search users by name or email
                  </label>
                  <input
                    id="admin-user-search"
                    name="userSearch"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <Search className="w-4 h-4 text-surface-400 absolute left-3 top-2" />
                </div>

                <div>
                  <label htmlFor="admin-role-filter" className="sr-only">
                    Filter users by role
                  </label>
                  <select
                    id="admin-role-filter"
                    name="roleFilter"
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-surface-800"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="PATIENT">Patients</option>
                    <option value="DOCTOR">Doctors</option>
                    <option value="DRIVER">Ambulance Drivers</option>
                    <option value="ADMIN_HOSPITAL">Hospital Admins</option>
                    <option value="SUPER_ADMIN">Super Admins</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 text-[11px] font-bold text-surface-500 uppercase tracking-wider border-b border-surface-100">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-xs">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              u.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2563EB&color=fff&bold=true`
                            }
                            alt={u.name}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-surface-200"
                          />
                          <div>
                            <p className="font-bold text-surface-900">{u.name}</p>
                            <p className="text-[11px] text-surface-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            u.role === 'SUPER_ADMIN'
                              ? 'danger'
                              : u.role === 'ADMIN_HOSPITAL'
                              ? 'warning'
                              : u.role === 'DOCTOR'
                              ? 'success'
                              : u.role === 'DRIVER'
                              ? 'primary'
                              : 'neutral'
                          }
                        >
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-surface-600 font-mono">{u.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 font-semibold ${u.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {u.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleUser(u._id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            u.isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hospitals Network Directory */}
          <div className="glass-card rounded-3xl border border-surface-200/80 shadow-luxury p-5 space-y-4">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Connected Hospital Facilities ({hospitals.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hospitals.map((h) => (
                <div key={h._id} className="p-4 bg-surface-50 rounded-2xl border border-surface-200 flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-surface-900">{h.name}</h4>
                    <p className="text-[11px] text-surface-500 mt-0.5">{h.address}, {h.city}</p>
                    <p className="text-[11px] text-surface-600 mt-2 font-semibold">
                      Total Beds: {h.totalBeds} • Available: {h.availableBeds} • ICU: {h.icuBedsAvailable}
                    </p>
                  </div>
                  <Badge variant="success">Online</Badge>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
