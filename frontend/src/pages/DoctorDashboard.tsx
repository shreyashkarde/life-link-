import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { StarRating } from '../components/common/StarRating';
import { Modal } from '../components/common/Modal';
import { doctorAPI, appointmentAPI } from '../api';
import { useToast } from '../context/ToastContext';
import { Appointment, DoctorSlot } from '../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Trash2,
  FileText,
  Activity,
  Award,
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // New Slot inputs
  const [newSlotDate, setNewSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSlotStart, setNewSlotStart] = useState('10:00');
  const [newSlotEnd, setNewSlotEnd] = useState('10:30');

  // Complete consultation modal
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null);
  const [prescription, setPrescription] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, apptRes, profileRes] = await Promise.all([
        doctorAPI.getDashboardStats(),
        appointmentAPI.getDoctorAppointments(),
        doctorAPI.getById('current').catch(() => null),
      ]);

      setStats(statsRes.data.stats);
      setAppointments(apptRes.data.appointments || []);
      if (profileRes?.data?.doctor?.availableSlots) {
        setSlots(profileRes.data.doctor.availableSlots);
      }
    } catch (err) {
      console.error('Error fetching doctor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [
      ...slots,
      {
        date: newSlotDate,
        startTime: newSlotStart,
        endTime: newSlotEnd,
        isBooked: false,
      },
    ];

    try {
      await doctorAPI.updateSlots(updated);
      setSlots(updated);
      addToast('success', `Added new slot for ${newSlotDate} at ${newSlotStart}`);
    } catch (err: any) {
      addToast('error', 'Failed to update slots');
    }
  };

  const handleDeleteSlot = async (index: number) => {
    const updated = slots.filter((_, i) => i !== index);
    try {
      await doctorAPI.updateSlots(updated);
      setSlots(updated);
      addToast('info', 'Slot removed');
    } catch (err) {
      addToast('error', 'Failed to remove slot');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!completingAppt) return;
    try {
      await appointmentAPI.updateStatus(completingAppt._id, {
        status: 'COMPLETED',
        prescription,
        notes: doctorNotes,
      });

      addToast('success', 'Consultation marked completed and prescription recorded.');
      setCompletingAppt(null);
      setPrescription('');
      setDoctorNotes('');
      fetchData();
    } catch (err) {
      addToast('error', 'Failed to update consultation');
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
              <h2 className="text-2xl font-black text-surface-900 tracking-tight">Doctor Clinical Portal</h2>
              <p className="text-xs text-surface-500 mt-0.5">Manage patient queues, schedule time slots, and write prescriptions.</p>
            </div>
            {stats?.averageRating && (
              <div className="flex items-center gap-2 p-2.5 bg-white border border-surface-200 rounded-2xl shadow-xs self-start">
                <StarRating rating={stats.averageRating} size="sm" showNumber />
                <span className="text-xs text-surface-400">({stats.reviewCount} reviews)</span>
              </div>
            )}
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Total Patients"
              value={stats?.totalAppointments || appointments.length}
              subtitle="All consultations"
              icon={User}
              color="blue"
            />
            <StatCard
              title="Pending Queue"
              value={stats?.pendingAppointments || appointments.filter((a) => a.status === 'BOOKED').length}
              subtitle="Ready for consult"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Completed"
              value={stats?.completedAppointments || appointments.filter((a) => a.status === 'COMPLETED').length}
              subtitle="Successfully treated"
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Fee Per Patient"
              value={`₹${stats?.consultationFee || 500}`}
              subtitle="Standard OPD rate"
              icon={Award}
              color="indigo"
            />
          </div>

          {/* Two Column Layout: Appointments & Slot Manager */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appointments Column (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden">
                <div className="p-4 border-b border-surface-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Patient Consultation Queue ({appointments.length})
                  </h3>
                </div>

                {appointments.length > 0 ? (
                  <div className="divide-y divide-surface-100">
                    {appointments.map((appt) => (
                      <div key={appt._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-surface-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              appt.patientId?.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                appt.patientId?.name || 'Patient'
                              )}&background=2563EB&color=fff`
                            }
                            alt="Patient"
                            className="w-11 h-11 rounded-xl object-cover border border-surface-200"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-surface-900">{appt.patientId?.name}</h4>
                              <Badge variant={appt.status === 'COMPLETED' ? 'success' : 'primary'}>
                                {appt.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-surface-500 mt-0.5">
                              Phone: {appt.patientId?.phone || 'N/A'} • Fee: ₹{appt.consultationFee}
                            </p>
                            <p className="text-[11px] text-surface-600 mt-1 font-medium">
                              Slot: <span className="font-bold">{appt.slotDate}</span> at <span className="font-bold">{appt.slotTime}</span>
                            </p>
                            {appt.symptoms && (
                              <p className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                                Symptoms: {appt.symptoms}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {appt.status === 'BOOKED' && (
                            <button
                              onClick={() => setCompletingAppt(appt)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-soft"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Consult & Prescribe</span>
                            </button>
                          )}
                          {appt.status === 'COMPLETED' && (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Completed</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-surface-400 text-xs">No pending appointments in queue.</div>
                )}
              </div>
            </div>

            {/* Slot Manager Column (1 col) */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                  <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Slot Manager
                  </h3>
                </div>

                {/* Add Slot Form */}
                <form onSubmit={handleAddSlot} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-surface-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-surface-800"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-surface-500 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={newSlotStart}
                        onChange={(e) => setNewSlotStart(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-surface-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-surface-500 mb-1">End Time</label>
                      <input
                        type="time"
                        value={newSlotEnd}
                        onChange={(e) => setNewSlotEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-surface-800"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Consultation Slot</span>
                  </button>
                </form>

                {/* Active Slots list */}
                <div className="pt-3 border-t border-surface-100 space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                    Configured Slots ({slots.length})
                  </p>
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 bg-surface-50 rounded-xl border border-surface-200 text-xs"
                    >
                      <div>
                        <p className="font-bold text-surface-900">{slot.date}</p>
                        <p className="text-[11px] text-surface-500">
                          {slot.startTime} - {slot.endTime} • {slot.isBooked ? '🔴 Booked' : '🟢 Open'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSlot(index)}
                        className="p-1.5 text-surface-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Complete Consultation Modal */}
      <Modal
        isOpen={!!completingAppt}
        onClose={() => setCompletingAppt(null)}
        title={`Complete Consultation: ${completingAppt?.patientId?.name}`}
        subtitle="Record clinical assessment & digital prescription"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Prescription / Medications
            </label>
            <textarea
              rows={3}
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="e.g. Tab Paracetamol 650mg TDS x 3 days, Syrup Ambroxol 5ml BD..."
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Clinical Notes / Follow-up Advice
            </label>
            <textarea
              rows={2}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Advice to repeat blood panel in 1 week if symptoms persist..."
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-100">
            <button
              onClick={() => setCompletingAppt(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteConsultation}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-soft"
            >
              Save & Mark Completed
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
