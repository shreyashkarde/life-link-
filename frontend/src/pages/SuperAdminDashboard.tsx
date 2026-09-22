import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { adminAPI } from '../api';
import { useToast } from '../context/ToastContext';
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
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
              <h2 className="text-2xl font-black text-surface-900 tracking-tight">
                Global Super Admin Control Plane
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Full network visibility, platform governance, user management, and hospital clusters.
              </p>
            </div>
            <span className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 self-start">
              System Health: 100% Operational
            </span>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total System Users"
              value={stats?.totalUsers || users.length}
              subtitle="Patients, Doctors, Drivers"
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Network Hospitals"
              value={stats?.hospitalsCount || hospitals.length}
              subtitle="Registered Facilities"
              icon={Building2}
              color="indigo"
            />
            <StatCard
              title="Completed Dispatches"
              value={stats?.totalRides || 0}
              subtitle="Emergency Trips"
              icon={Truck}
              color="emerald"
            />
            <StatCard
              title="Avg Response Time"
              value={`${stats?.avgResponseMinutes || 4.8} min`}
              subtitle="City-wide Dispatch"
              icon={Activity}
              color="amber"
            />
          </div>

          {/* User Management Section */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden">
            <div className="p-5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  User & Role Directory ({users.length})
                </h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <Search className="w-4 h-4 text-surface-400 absolute left-3 top-2" />
                </div>

                <select
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
                  {users.map((u: any) => (
                    <tr key={u._id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2563EB&color=fff`}
                            alt="Avatar"
                            className="w-8 h-8 rounded-xl object-cover border border-surface-200"
                          />
                          <div>
                            <p className="font-bold text-surface-900">{u.name}</p>
                            <p className="text-[11px] text-surface-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="primary">{u.role}</Badge>
                      </td>
                      <td className="py-3 px-4 text-surface-600">{u.phone || '—'}</td>
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
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-5 space-y-4">
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
