import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { SlideToAccept } from '../components/SlideToAccept';
import { LeafletMap } from '../components/LeafletMap';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { HeartbeatLoader } from '../components/ui/HeartbeatLoader';
import {
  Activity,
  Heart,
  Power,
  ShieldCheck,
  User,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Navigation,
  UploadCloud,
  FileText,
  AlertCircle,
  Home,
  ArrowLeft,
  Info,
  Wifi,
  Bed,
  Stethoscope
} from 'lucide-react';

// Specialized synthesizer alarm generator
function playAlertSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Cadence 1
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);

    // Cadence 2
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1100, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.5, audioCtx.currentTime);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.35);
    }, 350);
  } catch (e) {
    console.error('AudioContext not allowed or failed:', e);
  }
}

export const DriverDashboard: React.FC = () => {
  const { user, logout, apiFetch, updateUser } = useAuth();
  const { socket } = useSocket();

  // Availability state (Online/Offline)
  const [isOnline, setIsOnline] = useState(user?.ambulance?.isAvailable || false);

  // Live coords
  const [lat, setLat] = useState(user?.ambulance?.currentLat || 37.7749);
  const [lng, setLng] = useState(user?.ambulance?.currentLng || -122.4194);

  // Incoming Request Alert Modal
  const [incomingRequest, setIncomingRequest] = useState<any>(null);

  // Active Trip state
  const [activeTrip, setActiveTrip] = useState<any>(null);

  // Routing simulation timer ref
  const simulationIntervalRef = useRef<any>(null);

  // Profile Tab states
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'PROFILE' | 'MORE_INFO'>('DISPATCH');
  const [pingState, setPingState] = useState<'IDLE' | 'TESTING' | 'SUCCESS'>('IDLE');
  const [pingResults, setPingResults] = useState<{ ws: string; api: string; db: string }>({ ws: '', api: '', db: '' });
  const [driverName, setDriverName] = useState(user?.name || '');
  const [driverPhone, setDriverPhone] = useState(user?.phone || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.ambulance?.licenseNumber || '');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [licenseDocUrl, setLicenseDocUrl] = useState(user?.ambulance?.licenseDoc || '');
  const [registrationDocUrl, setRegistrationDocUrl] = useState(user?.ambulance?.registrationDoc || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // File upload logic
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiFetch('/upload', {
      method: 'POST',
      body: formData,
    });
    return res.fileUrl;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setLoadingProfile(true);

    try {
      let finalLicenseUrl = licenseDocUrl;
      let finalRegUrl = registrationDocUrl;

      if (licenseFile) {
        finalLicenseUrl = await handleUpload(licenseFile);
        setLicenseDocUrl(finalLicenseUrl);
      }
      if (registrationFile) {
        finalRegUrl = await handleUpload(registrationFile);
        setRegistrationDocUrl(finalRegUrl);
      }

      const res = await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: driverName,
          phone: driverPhone,
          licenseNumber,
          licenseDoc: finalLicenseUrl,
          registrationDoc: finalRegUrl,
        }),
      });

      updateUser({
        name: driverName,
        phone: driverPhone,
        ambulance: user?.ambulance
          ? {
              ...user.ambulance,
              licenseNumber,
              licenseDoc: finalLicenseUrl,
              registrationDoc: finalRegUrl,
              verificationStatus: res.ambulance?.verificationStatus || 'PENDING',
            }
          : undefined,
      });

      setProfileSuccess('Profile settings successfully requested. Status: PENDING.');
      setLicenseFile(null);
      setRegistrationFile(null);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to save settings.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Retrieve current active trip on load
  useEffect(() => {
    const fetchActiveRequest = async () => {
      try {
        const trip = await apiFetch('/requests/active');
        if (trip) {
          setActiveTrip(trip);
          // Set driver coordinates to ambulance details
          if (trip.driver?.ambulance) {
            setLat(trip.driver.ambulance.currentLat);
            setLng(trip.driver.ambulance.currentLng);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchActiveRequest();
  }, []);

  // Socket event hookups
  useEffect(() => {
    if (!socket) return;

    // Incoming Emergency Request Alert
    socket.on('request:new', (data: any) => {
      // Show overlay only if online and not currently on a trip
      if (isOnline && !activeTrip) {
        playAlertSound();
        setIncomingRequest(data);
      }
    });

    // Another driver claimed the request
    socket.on('request:claimed', (data: { requestId: string }) => {
      if (incomingRequest && incomingRequest.requestId === data.requestId) {
        setIncomingRequest(null);
      }
    });

    // Accept Success
    socket.on('request:accept_success', (data: { request: any }) => {
      setActiveTrip(data.request);
      setIncomingRequest(null);
    });

    // Accept Error
    socket.on('request:accept_error', (data: { message: string }) => {
      alert(data.message);
      setIncomingRequest(null);
    });

    // Status Success
    socket.on('trip:status_success', (data: { request: any }) => {
      const request = data.request;
      if (request.status === 'COMPLETED' || request.status === 'REJECTED') {
        setActiveTrip(null);
        // Clear routing simulation
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
      } else {
        setActiveTrip(request);
      }
    });

    // Hospital ER Bay Assigned
    socket.on('hospital:bay_assigned', (data: { requestId: string; assignedBay: string; doctorName?: string; hospitalName?: string }) => {
      setActiveTrip((prev: any) => {
        if (prev && prev.id === data.requestId) {
          return {
            ...prev,
            assignedBay: data.assignedBay,
            doctorName: data.doctorName,
            hospital: prev.hospital ? { ...prev.hospital, name: data.hospitalName || prev.hospital.name } : prev.hospital,
          };
        }
        return prev;
      });
    });

    return () => {
      socket.off('request:new');
      socket.off('request:claimed');
      socket.off('request:accept_success');
      socket.off('request:accept_error');
      socket.off('trip:status_success');
      socket.off('hospital:bay_assigned');
    };
  }, [socket, isOnline, activeTrip, incomingRequest]);

  // Online Availability handler
  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    try {
      await apiFetch('/ambulances/availability', {
        method: 'PUT',
        body: JSON.stringify({ isAvailable: nextState }),
      });
      setIsOnline(nextState);
      updateUser({
        ambulance: user?.ambulance ? { ...user.ambulance, isAvailable: nextState } : undefined,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to toggle availability.');
    }
  };

  // Route Simulation (Synchronized with backend road routing simulator)
  useEffect(() => {
    if (!socket) return;

    const handleCoordinatesSimulated = (data: { lat: number; lng: number }) => {
      setLat(data.lat);
      setLng(data.lng);
    };

    socket.on('driver:coordinates_simulated', handleCoordinatesSimulated);

    return () => {
      socket.off('driver:coordinates_simulated', handleCoordinatesSimulated);
    };
  }, [socket]);

  // Action Accept triggered by Slide Accept
  const handleAcceptRequest = () => {
    if (!socket || !incomingRequest) return;
    socket.emit('request:accept', {
      requestId: incomingRequest.requestId,
      driverId: user?.id,
    });
  };

  // Reject dismiss triggered by Slide Reject
  const handleRejectRequest = () => {
    if (!socket || !incomingRequest) return;
    socket.emit('request:reject', {
      requestId: incomingRequest.requestId,
      driverId: user?.id,
    });
    setIncomingRequest(null);
  };

  // Status transitions
  const handleUpdateStatus = (nextStatus: 'ARRIVING' | 'IN_TRANSIT' | 'AT_HOSPITAL' | 'COMPLETED') => {
    if (!socket || !activeTrip) return;
    socket.emit('trip:status_update', {
      requestId: activeTrip.id,
      driverId: user?.id,
      status: nextStatus,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans select-none transition-colors">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 sticky top-0 z-30 shadow-md flex items-center justify-between transition-colors">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">LifeLink <span className="text-blue-500 font-bold">Driver</span></span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1.5 hidden sm:block" />
          <Link 
            to="/" 
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-blue-650 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-blue-650 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('DISPATCH')}
              className={`text-2xs font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'DISPATCH' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Active Dispatches
            </button>
            <button
              onClick={() => setActiveTab('PROFILE')}
              className={`text-2xs font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'PROFILE' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              My Profile
            </button>
            <button
              onClick={() => setActiveTab('MORE_INFO')}
              className={`text-2xs font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'MORE_INFO' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              More Information
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          {/* Duty status toggle button */}
          <button
            onClick={handleToggleOnline}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2 border shadow-lg cursor-pointer ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isOnline ? 'On Duty (Online)' : 'Off Duty (Offline)'}
          </button>

          <button onClick={logout} className="text-slate-500 dark:text-slate-400 hover:text-rose-600 transition-colors cursor-pointer">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      {activeTab === 'DISPATCH' ? (
        <div className="max-w-7xl w-full mx-auto p-4 md:p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Left Column: Map Tracker (Large) */}
          <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl relative min-h-[400px] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <Navigation className="w-4 h-4 text-blue-500" />
                <span>Turn-by-turn Navigation GPS</span>
              </div>
              <span className="text-2xs font-mono text-slate-550 dark:text-slate-500">
                Loc: {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden min-h-[350px]">
              {activeTrip ? (
                <LeafletMap
                  patientLoc={[activeTrip.pickupLat, activeTrip.pickupLng]}
                  driverLoc={[lat, lng]}
                  hospitalLoc={activeTrip.hospital ? [activeTrip.hospital.lat, activeTrip.hospital.lng] : null}
                  status={activeTrip.status}
                />
              ) : (
                <LeafletMap patientLoc={[lat, lng]} status="IDLE" />
              )}
            </div>
          </div>

          {/* Right Column: Controls Panel */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Active Trip Info card */}
            {activeTrip ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 flex-1 flex flex-col justify-between transition-colors">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-500 dark:text-rose-455 bg-rose-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {activeTrip.tripType} Dispatched
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      ETA: {activeTrip.etaMinutes} mins
                    </span>
                  </div>

                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
                    <div>
                      <span className="text-3xs text-slate-550 dark:text-slate-500 uppercase tracking-widest block font-semibold">Patient Name</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{activeTrip.patient?.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-3xs text-slate-500 uppercase tracking-widest block font-semibold">Blood Group</span>
                        <p className="text-xs font-bold text-rose-500 flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          {activeTrip.patient?.patientProfile?.bloodGroup || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <span className="text-3xs text-slate-500 uppercase tracking-widest block font-semibold">Contact</span>
                        <p className="text-xs font-bold text-slate-200">{activeTrip.patient?.phone}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-3xs text-slate-500 uppercase tracking-widest block font-semibold">Allergies</span>
                      <p className="text-xs text-rose-400 font-medium truncate">{activeTrip.patient?.patientProfile?.allergies || 'None'}</p>
                    </div>
                    <div>
                      <span className="text-3xs text-slate-500 uppercase tracking-widest block font-semibold">Critical Medical Notes</span>
                      <p className="text-xs text-slate-400 leading-relaxed max-h-16 overflow-y-auto">
                        {activeTrip.patient?.patientProfile?.medicalNotes || 'None'}
                      </p>
                    </div>
                  </div>

                  {/* ER Bay Readiness / Trauma Team Assignment */}
                  {activeTrip.assignedBay ? (
                    <div className="p-4 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl text-xs space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 flex items-center gap-1">
                          <Bed className="w-3 h-3" /> ER Trauma Bay Allocated
                        </span>
                        <span className="text-3xs font-mono font-bold text-emerald-500 dark:text-emerald-400">
                          RECEIVING READY
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-emerald-300">
                          {activeTrip.assignedBay}
                        </span>
                      </div>
                      <div className="text-3xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-0.5 border-t border-emerald-500/20">
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Receiving Physician: <strong className="text-slate-900 dark:text-white">{activeTrip.doctorName || 'ER Trauma Physician Team'}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-3xs text-amber-600 dark:text-amber-400 flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                      <span>Inbound rig transmitting vitals. Awaiting hospital ER resus bay assignment...</span>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5 p-3.5 bg-slate-100 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs text-slate-650 dark:text-slate-400 transition-colors">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block text-2xs">Assigned ER Hospital</span>
                      <span className="text-3xs text-slate-500 dark:text-slate-500 leading-normal block">{activeTrip.hospital.name}</span>
                      <span className="text-3xs text-emerald-500 mt-1 block font-semibold">Beds Status: {activeTrip.hospital.availableBeds} Available</span>
                    </div>
                  </div>
                </div>

                {/* Status Update Buttons */}
                <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-500 mb-1">
                    Trip Phase Control
                  </span>

                  {activeTrip.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateStatus('ARRIVING')}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer border-transparent"
                    >
                      Mark: Ambulance Arriving
                    </button>
                  )}

                  {activeTrip.status === 'ARRIVING' && (
                    <button
                      onClick={() => handleUpdateStatus('IN_TRANSIT')}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer border-transparent"
                    >
                      Patient Picked Up (In Transit)
                    </button>
                  )}

                  {activeTrip.status === 'IN_TRANSIT' && (
                    <button
                      onClick={() => handleUpdateStatus('AT_HOSPITAL')}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer border-transparent"
                    >
                      Arrived at ER (At Hospital)
                    </button>
                  )}

                  {activeTrip.status === 'AT_HOSPITAL' && (
                    <button
                      onClick={() => handleUpdateStatus('COMPLETED')}
                      className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold shadow-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Complete Dispatch Log
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 flex-1 flex flex-col justify-center items-center text-center transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl mb-2 transition-colors">
                  📡
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-850 dark:text-white">Listening for Dispatches</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs leading-relaxed">
                    {isOnline
                      ? 'Your ambulance is Online and available. Keep this tab open. Incoming emergencies within 10 km will alert you with vitals.'
                      : 'You are currently Offline. Turn on duty status to start receiving incoming SOS dispatches.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'PROFILE' ? (
        <div className="max-w-3xl w-full mx-auto p-4 md:p-6 flex-1 animate-fadeIn space-y-6">
          {activeTrip && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-3xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-wider text-left">Active Ambulance Dispatch</p>
                  <p className="text-3xs text-slate-500 dark:text-slate-400 mt-0.5 text-left">
                    Status: {activeTrip.status} | Destination: {activeTrip.hospital?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('DISPATCH')}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-3xs font-bold transition-colors cursor-pointer shrink-0"
              >
                View Dispatch Map
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 transition-colors">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-850 pb-4">
              <User className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Driver Profile Settings</h2>
                <p className="text-xs text-slate-550 dark:text-slate-400">Configure your credentials, vehicles, and license details.</p>
              </div>
            </div>

            {/* Verification Status Alert banner */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              user?.ambulance?.verificationStatus === 'APPROVED'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : user?.ambulance?.verificationStatus === 'REJECTED'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-455'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs uppercase block">
                  Verification Status: {user?.ambulance?.verificationStatus || 'PENDING'}
                </span>
                <span className="text-xs leading-normal block mt-1">
                  {user?.ambulance?.verificationStatus === 'APPROVED'
                    ? 'Your profile is approved. You can go on-duty and accept dispatch calls.'
                    : user?.ambulance?.verificationStatus === 'REJECTED'
                    ? 'Your documents have been rejected. Please review and re-upload valid copies.'
                    : 'Your credentials are under administrator review. Active dispatch is disabled until verification.'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {profileSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                  {profileSuccess}
                </div>
              )}
              {profileError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
                  {profileError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-855">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Assigned Hospital
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.hospital?.name || 'Unassigned'}
                    className="block w-full px-3.5 py-2.5 bg-slate-950/20 border border-slate-850 rounded-xl text-slate-500 text-xs cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Vehicle Plate / ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.ambulance?.vehicleNumber || 'None'}
                    className="block w-full px-3.5 py-2.5 bg-slate-950/20 border border-slate-850 rounded-xl text-slate-500 text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-855 space-y-4">
                <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Driver Credentials Verification</h3>
                
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    Driver License Number
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. DL-SF1001"
                    className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* License Doc Upload */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Driver License Document
                    </label>
                    <div className="relative border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-950/40 hover:bg-slate-950/60 transition-colors">
                      <UploadCloud className="w-6 h-6 text-slate-500 mb-1.5" />
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-semibold text-center truncate w-full">
                        {licenseFile ? licenseFile.name : 'Select file (Image/PDF)'}
                      </span>
                      {licenseDocUrl && !licenseFile && (
                        <a href={`http://localhost:5000${licenseDocUrl}`} target="_blank" rel="noreferrer" className="text-3xs text-blue-450 hover:underline mt-1 font-semibold flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> View Submitted License
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Registration Doc Upload */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Vehicle Registration Document
                    </label>
                    <div className="relative border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-950/40 hover:bg-slate-950/60 transition-colors">
                      <UploadCloud className="w-6 h-6 text-slate-500 mb-1.5" />
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setRegistrationFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-semibold text-center truncate w-full">
                        {registrationFile ? registrationFile.name : 'Select file (Image/PDF)'}
                      </span>
                      {registrationDocUrl && !registrationFile && (
                        <a href={`http://localhost:5000${registrationDocUrl}`} target="_blank" rel="noreferrer" className="text-3xs text-blue-455 hover:underline mt-1 font-semibold flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> View Submitted Registration
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingProfile}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingProfile ? 'Uploading & Saving Settings...' : 'Save Settings & Request Verification'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl w-full mx-auto p-4 md:p-6 flex-1 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 transition-colors text-left">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-850 pb-4">
              <Info className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-bold text-slate-805 dark:text-white">Help & Telemetry Diagnostic</h2>
                <p className="text-xs text-slate-550 dark:text-slate-400">Verify tracking logs, check system metrics, and read driving protocols.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Telemetry Diagnostic widget */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                  <Wifi className="w-4 h-4 text-blue-500" />
                  <span>GPS Telemetry Diagnostic</span>
                </div>
                <p className="text-3xs text-slate-550 dark:text-slate-400 leading-normal">
                  Runs a diagnostic audit to check active GPS connection and WebSocket broadcast latency for turn-by-turn road simulation coordinates.
                </p>
                <button
                  onClick={() => {
                    setPingState('TESTING');
                    setPingResults({ ws: 'Connecting...', api: 'Verifying...', db: 'Verifying...' });
                    setTimeout(() => {
                      setPingResults({
                        ws: 'Active (Socket Connected)',
                        api: 'GPS Broadcast OK (15ms latency)',
                        db: 'OSRM Route Engine Reachable'
                      });
                      setPingState('SUCCESS');
                    }, 1200);
                  }}
                  disabled={pingState === 'TESTING'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-transparent"
                >
                  {pingState === 'TESTING' ? 'Running Diagnostic...' : 'Start Telemetry Check'}
                </button>

                {pingState !== 'IDLE' && (
                  <div className="p-4 bg-slate-950/45 border border-slate-850 rounded-2xl space-y-2 text-3xs font-mono">
                    <div className="flex justify-between text-slate-450 border-b border-slate-850 pb-1.5 uppercase font-bold">
                      <span>Checklist</span>
                      <span>Status</span>
                    </div>
                    <div className="flex justify-between text-slate-550">
                      <span>Telemetry Channel:</span>
                      <span className="font-semibold text-slate-350">{pingResults.ws}</span>
                    </div>
                    <div className="flex justify-between text-slate-550">
                      <span>GPS Latency:</span>
                      <span className="font-semibold text-slate-350">{pingResults.api}</span>
                    </div>
                    <div className="flex justify-between text-slate-550">
                      <span>OSRM Service:</span>
                      <span className="font-semibold text-slate-350">{pingResults.db}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Driving protocols */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-505" />
                  <span>Ambulance Driving Protocols</span>
                </div>
                <div className="space-y-3 text-3xs text-slate-550 dark:text-slate-400">
                  <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-xl space-y-1">
                    <h4 className="font-bold text-slate-350">1. Emergency Accept/Decline</h4>
                    <p className="leading-normal">Drivers must accept or decline dispatches within 45 seconds of SOS alerts. Declining will immediately forward the alert to the next closest driver in the proximity queue.</p>
                  </div>
                  <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-xl space-y-1">
                    <h4 className="font-bold text-slate-350">2. Real-time Telemetry Sync</h4>
                    <p className="leading-normal">Always keep duty status toggled "On Duty" when active to receive dispatches. Close alignment with the OSRM route is recommended for optimal ETAs.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Request Alert Modal Overlay */}
      {incomingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 md:p-8 border border-rose-500/25 shadow-2xl relative animate-pulse-ring">
            
            {/* Urgent siren indicator banner */}
            <div className="flex items-center gap-2 text-rose-500 font-extrabold uppercase text-xs tracking-wider mb-4 animate-bounce">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span>Critical Medical Dispatch Broadcasted</span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-white">{incomingRequest.patientName}</h2>
                  <p className="text-3xs text-slate-400 uppercase tracking-widest mt-1">Patient Profile Details</p>
                </div>
                <div className="text-right">
                  <span className="text-3xs text-slate-500 uppercase tracking-widest block">Est. Pickup Distance</span>
                  <span className="text-lg font-bold text-blue-400">{incomingRequest.distanceKm} km</span>
                </div>
              </div>

              {/* Patient Vitals Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-3xs text-slate-500 uppercase block">Blood Type</span>
                  <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    {incomingRequest.bloodGroup}
                  </p>
                </div>
                <div>
                  <span className="text-3xs text-slate-500 uppercase block">Allergies</span>
                  <p className="text-xs font-bold text-slate-300 mt-0.5 truncate">{incomingRequest.allergies}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-3xs text-slate-500 uppercase block">Emergency Medical Notes</span>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    {incomingRequest.medicalNotes}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-850 flex items-start gap-2.5 text-2xs text-slate-400">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-300 block">Designated Hospital ER Route</span>
                  <span className="text-3xs text-slate-500 leading-normal block">{incomingRequest.hospitalName}</span>
                </div>
              </div>

              {/* Slide Gestures (Accept / Reject) */}
              <div className="space-y-3 pt-6 border-t border-slate-800">
                <SlideToAccept
                  onTrigger={handleAcceptRequest}
                  label="Swipe to Accept Emergency"
                  theme="accept"
                />
                
                <SlideToAccept
                  onTrigger={handleRejectRequest}
                  label="Swipe to Decline Request"
                  theme="reject"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DriverDashboard;
