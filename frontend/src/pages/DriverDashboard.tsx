import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { GoogleLiveTrackingMap } from '../components/map/GoogleLiveTrackingMap';
import { IncomingRideModal } from '../components/driver/IncomingRideModal';
import { RideStatusCard } from '../components/driver/RideStatusCard';
import { GPSSimulator } from '../components/driver/GPSSimulator';
import { ambulanceAPI, bookingAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { Ambulance, AmbulanceBooking } from '../types';
import {
  Truck,
  Power,
  Navigation,
  DollarSign,
  Star,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const { socket } = useSocket();
  const { addToast } = useToast();

  const [ambulance, setAmbulance] = useState<Ambulance | null>(null);
  const [activeBooking, setActiveBooking] = useState<AmbulanceBooking | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<AmbulanceBooking | null>(null);
  const [tripHistory, setTripHistory] = useState<AmbulanceBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDriverData = async () => {
    setLoading(true);
    try {
      const [profRes, histRes] = await Promise.all([
        ambulanceAPI.getDriverProfile(),
        bookingAPI.getDriverHistory(),
      ]);

      setAmbulance(profRes.data.ambulance);
      const history: AmbulanceBooking[] = histRes.data.bookings || [];
      setTripHistory(history);

      const ongoing = history.find((b) =>
        ['ACCEPTED', 'ONGOING', 'ARRIVED_AT_PATIENT', 'ARRIVED_AT_HOSPITAL'].includes(b.status)
      );
      if (ongoing) setActiveBooking(ongoing);
    } catch (err) {
      console.error('Error fetching driver profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  // Listen for real-time incoming booking requests via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (bookingData: AmbulanceBooking) => {
      console.log('[Socket] Incoming ride request:', bookingData);
      setIncomingRequest(bookingData);
      addToast('warning', '🚑 NEW AMBULANCE RIDE REQUEST RECEIVED!', 'Emergency Dispatch');
    };

    const handleSOS = (sosData: AmbulanceBooking) => {
      console.log('[Socket] High-Priority SOS Received:', sosData);
      setIncomingRequest(sosData);
      addToast('error', '🚨 HIGH-PRIORITY 1-CLICK SOS EMERGENCY DISPATCH!', 'SOS Alert');
    };

    socket.on('booking:incomingRequest', handleIncoming);
    socket.on('emergency:highPriorityAlert', handleSOS);

    return () => {
      socket.off('booking:incomingRequest', handleIncoming);
      socket.off('emergency:highPriorityAlert', handleSOS);
    };
  }, [socket]);

  const handleToggleOnline = async () => {
    if (!ambulance) return;
    const nextOnline = !ambulance.isOnline;

    try {
      const res = await ambulanceAPI.toggleDriverStatus({ isOnline: nextOnline });
      setAmbulance(res.data.ambulance);
      addToast(
        nextOnline ? 'success' : 'info',
        `Ambulance status updated to ${nextOnline ? 'Online (Available)' : 'Offline'}`
      );
    } catch (err) {
      addToast('error', 'Failed to toggle status');
    }
  };

  const handleAcceptRide = async (bookingId: string) => {
    try {
      const res = await bookingAPI.driverResponse(bookingId, 'ACCEPT');
      const updated = res.data.booking;
      setActiveBooking(updated);
      setIncomingRequest(null);

      // Notify patient through socket
      if (socket) {
        socket.emit('booking:driverAccepted', {
          bookingId: updated._id,
          driverId: updated.driverId?._id || updated.driverId?.id,
          patientId: updated.patientId?._id || updated.patientId?.id,
        });
      }

      addToast('success', 'Ride accepted! Route to patient is active.');
      fetchDriverData();
    } catch (err) {
      addToast('error', 'Failed to accept ride');
    }
  };

  const handleRejectRide = async (bookingId: string) => {
    try {
      await bookingAPI.driverResponse(bookingId, 'REJECT');
      setIncomingRequest(null);
      addToast('info', 'Ride request declined.');
    } catch (err) {
      setIncomingRequest(null);
    }
  };

  const handleUpdateStatus = async (bookingId: string, nextStatus: string) => {
    try {
      const res = await bookingAPI.updateStatus(bookingId, { status: nextStatus });
      const updated = res.data.booking;
      setActiveBooking(updated.status === 'COMPLETED' ? null : updated);

      if (socket) {
        socket.emit('booking:updateStatus', {
          bookingId,
          status: nextStatus,
          patientId: updated.patientId?._id || updated.patientId?.id,
        });
      }

      addToast('success', `Trip status advanced to ${nextStatus.replace(/_/g, ' ')}`);
      fetchDriverData();
    } catch (err) {
      addToast('error', 'Failed to update ride status');
    }
  };

  const totalEarnings = tripHistory
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.fare || 0), 0);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Header with Online/Offline Toggle */}
          <div className="bg-white rounded-3xl p-6 border border-surface-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-soft">
                🚑
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-surface-900 tracking-tight">
                    {ambulance?.vehicleNumber || 'Ambulance Unit'}
                  </h2>
                  <Badge variant={ambulance?.isOnline ? 'success' : 'neutral'} dot>
                    {ambulance?.isOnline ? 'ONLINE (READY)' : 'OFFLINE'}
                  </Badge>
                </div>
                <p className="text-xs text-surface-500 mt-0.5">
                  {ambulance?.vehicleModel} • {ambulance?.ambulanceType}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition-all shadow-soft ${
                ambulance?.isOnline
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{ambulance?.isOnline ? 'Go Offline' : 'Go Online for Dispatch'}</span>
            </button>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Today's Earnings"
              value={`₹${totalEarnings}`}
              subtitle="Completed Trips"
              icon={DollarSign}
              color="emerald"
            />
            <StatCard
              title="Total Trips"
              value={tripHistory.length}
              subtitle="All time dispatches"
              icon={Truck}
              color="blue"
            />
            <StatCard
              title="Driver Rating"
              value={ambulance?.averageRating ? ambulance.averageRating.toFixed(1) : '4.9'}
              subtitle="Patient Reviews"
              icon={Star}
              color="amber"
            />
            <StatCard
              title="Live Status"
              value={ambulance?.status || 'AVAILABLE'}
              subtitle="GPS Heartbeat Active"
              icon={Activity}
              color="indigo"
            />
          </div>

          {/* GPS Transmitter / Driving Motion Simulator */}
          <GPSSimulator
            currentLat={ambulance?.currentLocation?.lat || 19.076}
            currentLng={ambulance?.currentLocation?.lng || 72.8777}
            bookingId={activeBooking?._id}
            onLocationUpdate={(lat, lng) => {
              if (ambulance) {
                setAmbulance({
                  ...ambulance,
                  currentLocation: { ...ambulance.currentLocation, lat, lng },
                });
              }
            }}
          />

          {/* Main Content Layout: Active Ride Stepper & Live Map */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Active Ride Status Card & History */}
            <div className="space-y-4">
              {activeBooking ? (
                <RideStatusCard
                  booking={activeBooking}
                  onUpdateStatus={handleUpdateStatus}
                />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-surface-100 shadow-card text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl">
                    📡
                  </div>
                  <h4 className="text-xs font-bold text-surface-900">Waiting for Dispatch Requests</h4>
                  <p className="text-[11px] text-surface-500 leading-relaxed">
                    Keep the driver app open and status Online to receive incoming emergency patient requests automatically.
                  </p>
                </div>
              )}

              {/* Trip History Preview */}
              <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-4 space-y-3">
                <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Recent Completed Trips ({tripHistory.length})
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {tripHistory.slice(0, 5).map((t) => (
                    <div
                      key={t._id}
                      className="p-2.5 bg-surface-50 rounded-xl border border-surface-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-surface-900 truncate max-w-[140px]">
                          {t.pickupLocation?.address}
                        </p>
                        <p className="text-[10px] text-surface-400">
                          {new Date(t.createdAt).toLocaleDateString()} • {t.ambulanceType}
                        </p>
                      </div>
                      <span className="font-bold text-blue-700">₹{t.fare}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Live Map View (2 cols) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    Live Route & GPS Navigation
                  </h3>
                  <span className="text-[11px] text-surface-500 font-semibold">
                    Vehicle: {ambulance?.vehicleNumber}
                  </span>
                </div>

                <GoogleLiveTrackingMap
                  driverLocation={ambulance?.currentLocation}
                  pickupLocation={activeBooking?.pickupLocation}
                  hospitalLocation={{
                    lat: 19.0668,
                    lng: 72.8682,
                    name: 'LifeLink Central Trauma Hospital',
                  }}
                  height="460px"
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Real-time Incoming Ride Request Modal */}
      <IncomingRideModal
        booking={incomingRequest}
        isOpen={!!incomingRequest}
        onAccept={handleAcceptRide}
        onReject={handleRejectRide}
      />
    </div>
  );
};
