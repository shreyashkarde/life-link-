import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveTrackingMap } from '../components/map/LiveTrackingMap';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { Badge } from '../components/common/Badge';
import { RatingModal } from '../components/patient/RatingModal';
import { bookingAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { AmbulanceBooking } from '../types';
import {
  Phone,
  ShieldAlert,
  Clock,
  Navigation,
  CheckCircle2,
  ArrowLeft,
  Star,
  Activity,
} from 'lucide-react';

export const LiveRideTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, joinBookingRoom } = useSocket();
  const { addToast } = useToast();

  const [booking, setBooking] = useState<AmbulanceBooking | null>(null);
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const fetchBooking = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await bookingAPI.getById(id);
      const b: AmbulanceBooking = res.data.booking;
      setBooking(b);

      if (b.driverLiveLocation?.lat && b.driverLiveLocation?.lng) {
        setDriverCoords({
          lat: b.driverLiveLocation.lat,
          lng: b.driverLiveLocation.lng,
        });
      } else if (b.ambulanceId?.currentLocation) {
        setDriverCoords({
          lat: b.ambulanceId.currentLocation.lat,
          lng: b.ambulanceId.currentLocation.lng,
        });
      }
    } catch (err) {
      console.error('Failed to fetch booking details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  // Join Socket.io tracking room
  useEffect(() => {
    if (!id) return;
    joinBookingRoom(id);

    if (!socket) return;

    // Real-time location update
    const handleLocationUpdate = (data: { lat: number; lng: number; speed?: number }) => {
      console.log('[Socket] Received Live Driver Location:', data);
      setDriverCoords({ lat: data.lat, lng: data.lng });
    };

    // Real-time status update
    const handleStatusUpdate = (data: { status: string }) => {
      console.log('[Socket] Ride status changed to:', data.status);
      setBooking((prev) => (prev ? { ...prev, status: data.status as any } : null));

      addToast('info', `Ambulance status updated: ${data.status.replace(/_/g, ' ')}`);

      if (data.status === 'COMPLETED') {
        setIsRatingOpen(true);
      }
    };

    socket.on('booking:driverLocation', handleLocationUpdate);
    socket.on('booking:statusChanged', handleStatusUpdate);

    return () => {
      socket.off('booking:driverLocation', handleLocationUpdate);
      socket.off('booking:statusChanged', handleStatusUpdate);
    };
  }, [id, socket]);

  if (loading || !booking) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center text-xs text-surface-400">
            Connecting to ambulance live GPS stream...
          </div>
        </div>
      </div>
    );
  }

  const isSOS = booking.isSOS || booking.tripType === 'SOS_EMERGENCY';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Back & Status Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/patient')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-surface-200 hover:bg-surface-50 text-xs font-bold text-surface-700 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Patient Portal</span>
            </button>

            <div className="flex items-center gap-2">
              <Badge variant={isSOS ? 'emergency' : 'primary'} dot>
                {booking.status.replace(/_/g, ' ')}
              </Badge>
              {isSOS && (
                <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200 animate-pulse flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>CRITICAL SOS DISPATCH</span>
                </span>
              )}
            </div>
          </div>

          {/* Stepper Progression */}
          <div className="bg-white rounded-3xl p-5 border border-surface-100 shadow-card">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { step: 'ACCEPTED', label: '1. Driver Assigned' },
                { step: 'ONGOING', label: '2. En Route to You' },
                { step: 'ARRIVED_AT_PATIENT', label: '3. Arrived at Patient' },
                { step: 'COMPLETED', label: '4. At Hospital Care' },
              ].map((s, idx) => {
                const statuses = ['PENDING', 'ACCEPTED', 'ONGOING', 'ARRIVED_AT_PATIENT', 'ARRIVED_AT_HOSPITAL', 'COMPLETED'];
                const currentIdx = statuses.indexOf(booking.status);
                const stepIdx = statuses.indexOf(s.step);
                const isPassed = currentIdx >= stepIdx;
                const isCurrent = booking.status === s.step;

                return (
                  <div key={s.step} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                        isPassed
                          ? 'bg-blue-600 text-white shadow-soft ring-4 ring-blue-50'
                          : 'bg-surface-100 text-surface-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`font-semibold text-[11px] ${
                        isCurrent ? 'text-blue-600 font-bold' : isPassed ? 'text-surface-800' : 'text-surface-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Tracking Map and Driver Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Map Area (2 cols) */}
            <div className="lg:col-span-2">
              <LiveTrackingMap
                driverLocation={driverCoords || undefined}
                pickupLocation={booking.pickupLocation}
                hospitalLocation={{
                  lat: 19.0668,
                  lng: 72.8682,
                  name: 'LifeLink Central Trauma Hospital',
                }}
                height="500px"
              />
            </div>

            {/* Driver & Trip Info Card (1 col) */}
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-surface-100 shadow-card space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-surface-100">
                  <div>
                    <h3 className="text-sm font-bold text-surface-900">Live Ambulance Unit</h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {booking.ambulanceType} Dispatch
                    </p>
                  </div>
                  <span className="text-lg font-black text-blue-700">₹{booking.fare}</span>
                </div>

                {/* Driver Profile */}
                <div className="flex items-center gap-3">
                  <img
                    src={
                      booking.driverId?.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        booking.driverId?.name || 'Driver'
                      )}&background=2563EB&color=fff`
                    }
                    alt="Driver"
                    className="w-14 h-14 rounded-2xl object-cover border border-surface-200 shadow-xs"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-surface-900">
                      {booking.driverId?.name || 'Assigned Paramedic Driver'}
                    </h4>
                    <p className="text-[11px] text-surface-500">
                      Plate: <span className="font-bold text-surface-800">{booking.ambulanceId?.vehicleNumber || 'MH02EK4021'}</span>
                    </p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live GPS Heartbeat Active
                    </p>
                  </div>
                </div>

                {/* Call Driver Button */}
                <a
                  href={`tel:${booking.driverId?.phone || '108'}`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-soft"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Ambulance Driver Now</span>
                </a>

                {/* Trip ETA & Distance Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl">
                    <p className="text-[11px] text-blue-800 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Estimated ETA</span>
                    </p>
                    <p className="text-xl font-black text-blue-900 mt-1">~{booking.etaMinutes} min</p>
                  </div>
                  <div className="p-3 bg-surface-50 border border-surface-200 rounded-2xl">
                    <p className="text-[11px] text-surface-500 font-bold flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Distance</span>
                    </p>
                    <p className="text-xl font-black text-surface-900 mt-1">{booking.distanceKm} km</p>
                  </div>
                </div>

                {/* Destination */}
                <div className="p-3.5 bg-surface-50 rounded-2xl border border-surface-100 text-xs text-surface-600">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Destination</p>
                  <p className="font-bold text-surface-900 mt-0.5">
                    {booking.destinationLocation?.address || 'LifeLink Central Trauma Hospital'}
                  </p>
                </div>

                {booking.status === 'COMPLETED' && (
                  <button
                    onClick={() => setIsRatingOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-soft"
                  >
                    <Star className="w-4 h-4" />
                    <span>Rate Ambulance Experience</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        targetType="DRIVER"
        targetId={booking.driverId?._id || booking.driverId?.id || ''}
        targetName={booking.driverId?.name || 'Driver'}
        bookingId={booking._id}
      />
    </div>
  );
};
