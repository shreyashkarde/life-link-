import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Clock,
  Plus,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Ticket,
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';
import { MEDICAL_SPECIALIZATIONS } from '../../constants/specializations';

interface DoctorAppointmentsSectionProps {
  apiFetch: (url: string, options?: any) => Promise<any>;
  hospitalName?: string;
}

export const DoctorAppointmentsSection: React.FC<DoctorAppointmentsSectionProps> = ({
  apiFetch,
  hospitalName,
}) => {
  // Active sub-tab
  const [subTab, setSubTab] = useState<'SLOTS_ROSTER' | 'DOCTORS_MANAGEMENT'>('SLOTS_ROSTER');

  // Doctors State
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docSpecialization, setDocSpecialization] = useState<string>(MEDICAL_SPECIALIZATIONS[0]);
  const [docQualifications, setDocQualifications] = useState('');
  const [docExperience, setDocExperience] = useState('5');
  const [docFee, setDocFee] = useState('50');
  const [addingDoctor, setAddingDoctor] = useState(false);
  const [doctorActionMsg, setDoctorActionMsg] = useState('');

  // Daily Slots Roster State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  const [slotsRoster, setSlotsRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);

  // Add Slot Modal State
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [slotDoctorId, setSlotDoctorId] = useState('');
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:00');
  const [slotMaxPatients, setSlotMaxPatients] = useState('5');
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState('');

  // Status update
  const [updatingAptId, setUpdatingAptId] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchSlotsRoster();
  }, [selectedDate, selectedDoctorFilter]);

  // Fetch Doctors for this Hospital
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const data = await apiFetch('/doctors');
      setDoctors(data);
      if (data.length > 0 && !slotDoctorId) {
        setSlotDoctorId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch Day's Slots Roster (Feature 3)
  const fetchSlotsRoster = async () => {
    setLoadingRoster(true);
    try {
      let url = `/doctors/hospital/slots?date=${selectedDate}`;
      if (selectedDoctorFilter !== 'ALL') {
        url += `&doctorId=${selectedDoctorFilter}`;
      }
      const data = await apiFetch(url);
      setSlotsRoster(data.slots || []);
    } catch (err) {
      console.error('Failed to load slots roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Create Doctor
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingDoctor(true);
    setDoctorActionMsg('');

    try {
      await apiFetch('/doctors', {
        method: 'POST',
        body: JSON.stringify({
          name: docName.trim(),
          specialization: docSpecialization,
          qualifications: docQualifications.trim() || undefined,
          experienceYears: parseInt(docExperience) || 0,
          consultationFee: parseFloat(docFee) || 0,
        }),
      });

      setShowAddDoctorModal(false);
      setDocName('');
      setDocQualifications('');
      setDoctorActionMsg('Doctor added successfully.');
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to create doctor');
    } finally {
      setAddingDoctor(false);
    }
  };

  // Toggle Doctor Active Status
  const handleToggleDoctorActive = async (doctor: any) => {
    try {
      await apiFetch(`/doctors/${doctor.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !doctor.isActive }),
      });
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to update doctor status');
    }
  };

  // Create Slot
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDoctorId) return;

    setAddingSlot(true);
    setSlotError('');

    try {
      await apiFetch(`/doctors/${slotDoctorId}/slots`, {
        method: 'POST',
        body: JSON.stringify({
          date: slotDate,
          startTime: slotStartTime,
          endTime: slotEndTime,
          maxPatients: parseInt(slotMaxPatients) || 5,
        }),
      });

      setShowAddSlotModal(false);
      fetchSlotsRoster();
    } catch (err: any) {
      setSlotError(err.message || 'Failed to create slot');
    } finally {
      setAddingSlot(false);
    }
  };

  // Delete Slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return;
    try {
      await apiFetch(`/doctors/slots/${slotId}`, {
        method: 'DELETE',
      });
      fetchSlotsRoster();
    } catch (err: any) {
      alert(err.message || 'Failed to delete slot');
    }
  };

  // Update Appointment Status (e.g. COMPLETED or CANCELLED)
  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    setUpdatingAptId(appointmentId);
    try {
      await apiFetch(`/appointments/${appointmentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      fetchSlotsRoster();
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment');
    } finally {
      setUpdatingAptId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Doctors & Outpatient Appointment Roster
            </h3>
            <span className="text-2xs text-slate-500 dark:text-slate-400">
              Manage doctor specialists, configure hourly caps, and view booked patient queues
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('SLOTS_ROSTER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'SLOTS_ROSTER'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Day's Slot Roster
          </button>
          <button
            onClick={() => setSubTab('DOCTORS_MANAGEMENT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'DOCTORS_MANAGEMENT'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Manage Doctors ({doctors.length})
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          SUBTAB 1: SLOTS ROSTER (Feature 3)
          ------------------------------------------------------------- */}
      {subTab === 'SLOTS_ROSTER' && (
        <div className="space-y-6">
          {/* Controls Bar: Date, Doctor Filter, + Add Slot */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date selector */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Doctor filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedDoctorFilter}
                  onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchSlotsRoster}
                className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title="Refresh Roster"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRoster ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* + Add Slot Button */}
            <button
              onClick={() => setShowAddSlotModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Time Slot</span>
            </button>
          </div>

          {/* Slots Table */}
          {loadingRoster ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800">
              Loading appointment slots & capacity...
            </div>
          ) : slotsRoster.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p>No appointment slots scheduled for {selectedDate}.</p>
              <button
                onClick={() => setShowAddSlotModal(true)}
                className="text-emerald-500 font-bold hover:underline cursor-pointer"
              >
                + Create a slot for today
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3 px-4">Doctor & Specialization</th>
                      <th className="py-3 px-4">Time Window</th>
                      <th className="py-3 px-4 text-center">Capacity</th>
                      <th className="py-3 px-4 text-center">Booked</th>
                      <th className="py-3 px-4 text-center">Remaining</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {slotsRoster.map((slot) => {
                      const isExpanded = expandedSlotId === slot.id;
                      const hasPatients = slot.patients && slot.patients.length > 0;

                      return (
                        <React.Fragment key={slot.id}>
                          <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              <div>
                                <span>{slot.doctorName}</span>
                                <span className="block text-3xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {slot.specialization}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                              {slot.startTime} - {slot.endTime}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {slot.capacity}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold">
                              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                {slot.booked}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold">
                              {slot.remaining > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  {slot.remaining} Available
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  FULL
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setExpandedSlotId(isExpanded ? null : slot.id)}
                                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                    isExpanded
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                  }`}
                                >
                                  <span>{slot.booked} Patient{slot.booked !== 1 ? 's' : ''}</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {slot.booked === 0 && (
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title="Delete empty slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Row Revealing Booked Patient Details */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-slate-50/90 dark:bg-slate-900/80 p-4 border-t border-b border-slate-200 dark:border-slate-800">
                                {!hasPatients ? (
                                  <div className="text-center py-4 text-3xs text-slate-400 font-semibold">
                                    No patients booked for this time slot yet.
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <span className="text-2xs font-mono font-extrabold uppercase tracking-wider text-slate-400 block">
                                      Booked Queue ({slot.patients.length} Registered Patients)
                                    </span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {slot.patients.map((pat: any) => (
                                        <div
                                          key={pat.appointmentId}
                                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2"
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2.5">
                                              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                                                #{String(pat.tokenNumber).padStart(2, '0')}
                                              </span>
                                              <div>
                                                <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                                                  {pat.patientName}
                                                </h5>
                                                <p className="text-3xs text-slate-400 font-mono">
                                                  {pat.patientPhone}
                                                </p>
                                              </div>
                                            </div>

                                            <span
                                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                                pat.status === 'COMPLETED'
                                                  ? 'bg-blue-500/10 text-blue-500'
                                                  : pat.status === 'CANCELLED'
                                                  ? 'bg-rose-500/10 text-rose-500'
                                                  : 'bg-emerald-500/10 text-emerald-500'
                                              }`}
                                            >
                                              {pat.status}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2 text-3xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-850">
                                            <div>
                                              <span className="text-slate-400">Blood Group:</span>{' '}
                                              <span className="font-bold text-slate-700 dark:text-slate-300">{pat.bloodGroup}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-400">Allergies:</span>{' '}
                                              <span className="font-bold text-slate-700 dark:text-slate-300">{pat.allergies}</span>
                                            </div>
                                          </div>

                                          {pat.symptoms && (
                                            <div className="text-3xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl">
                                              <span className="font-semibold text-slate-400">Symptoms:</span> "{pat.symptoms}"
                                            </div>
                                          )}

                                          {/* Status Action Buttons */}
                                          {pat.status === 'BOOKED' && (
                                            <div className="flex gap-2 pt-1">
                                              <button
                                                onClick={() => handleUpdateAppointmentStatus(pat.appointmentId, 'COMPLETED')}
                                                disabled={updatingAptId === pat.appointmentId}
                                                className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
                                              >
                                                Mark Completed
                                              </button>
                                              <button
                                                onClick={() => handleUpdateAppointmentStatus(pat.appointmentId, 'CANCELLED')}
                                                disabled={updatingAptId === pat.appointmentId}
                                                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-500 text-[10px] font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SUBTAB 2: DOCTORS MANAGEMENT
          ------------------------------------------------------------- */}
      {subTab === 'DOCTORS_MANAGEMENT' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Hospital Doctors Directory ({doctors.length} Registered)
            </h4>
            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Doctor</span>
            </button>
          </div>

          {loadingDoctors ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800">
              Loading doctors directory...
            </div>
          ) : doctors.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p>No doctors currently registered for this medical center.</p>
              <button
                onClick={() => setShowAddDoctorModal(true)}
                className="text-emerald-500 font-bold hover:underline cursor-pointer"
              >
                + Register your first doctor specialist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                    doc.isActive
                      ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-850 opacity-60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                          {doc.name}
                        </h5>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
                          {doc.specialization}
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                        ${doc.consultationFee || 0}
                      </span>
                    </div>

                    {doc.qualifications && (
                      <p className="text-3xs text-slate-500 dark:text-slate-400">
                        {doc.qualifications} · {doc.experienceYears || 0} yrs exp
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    <span
                      className={`text-3xs font-bold uppercase ${
                        doc.isActive ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                    >
                      {doc.isActive ? 'Active on Roster' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleToggleDoctorActive(doc)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-3xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                    >
                      {doc.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: Add Doctor (Feature 2)
          ------------------------------------------------------------- */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Add Doctor Specialist
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Register a medical specialist to your hospital roster
                </p>
              </div>
              <button
                onClick={() => setShowAddDoctorModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Doctor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Chen, MD"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Medical Specialization *
                </label>
                <select
                  value={docSpecialization}
                  onChange={(e) => setDocSpecialization(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {MEDICAL_SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Qualifications & Certifications
                </label>
                <input
                  type="text"
                  placeholder="e.g. MBBS, MD (Cardiology), FACC"
                  value={docQualifications}
                  onChange={(e) => setDocQualifications(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={docExperience}
                    onChange={(e) => setDocExperience(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Consultation Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDoctor}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  {addingDoctor ? 'Registering...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: Create Time Slot (Feature 3)
          ------------------------------------------------------------- */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Create Consultation Slot
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure hourly capacity and availability window
                </p>
              </div>
              <button
                onClick={() => setShowAddSlotModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {slotError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{slotError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Assign Doctor Specialist *
                </label>
                <select
                  value={slotDoctorId}
                  onChange={(e) => setSlotDoctorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Date (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  required
                  value={slotDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Slot Hourly Capacity (maxPatients) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={slotMaxPatients}
                  onChange={(e) => setSlotMaxPatients(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-3xs text-slate-400 mt-1 block">
                  Atomic concurrency locking prevents overbooking past this exact limit.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSlot}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  {addingSlot ? 'Creating...' : 'Create Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
