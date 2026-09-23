import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const getHeaders = () => {
  const token =
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('aToken') ||
    sessionStorage.getItem('dToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('aToken') ||
    localStorage.getItem('dToken') ||
    '';

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      token,
    },
  };
};

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface AmbulanceItem {
  _id: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  ambulanceType: string;
  currentLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  isAvailable: boolean;
  currentStatus: string;
  assignedHospital: string;
  rating: number;
  distanceKm?: number;
  etaMinutes?: number;
}

export const ambulanceService = {
  // Geo-search for closest available ambulances
  getNearbyAmbulances: async (lat: number = 19.076, lng: number = 72.8777, radius: number = 25) => {
    const { data } = await axios.get(`${BACKEND_URL}/api/ambulance/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    return data;
  },

  getAllAmbulances: async () => {
    const { data } = await axios.get(`${BACKEND_URL}/api/ambulance/all`);
    return data;
  },

  // Normal Ambulance Booking
  createBooking: async (payload: {
    pickupLocation: { address: string; lat: number; lng: number };
    destinationHospital?: { name: string; address: string; lat: number; lng: number };
    patientName?: string;
    patientPhone?: string;
    ambulanceId?: string;
  }) => {
    const { data } = await axios.post(`${BACKEND_URL}/api/bookings/create`, payload, getHeaders());
    return data;
  },

  // One-Click Emergency SOS Dispatch
  triggerEmergencySOS: async (payload: {
    pickupLocation?: { address: string; lat: number; lng: number };
    patientName?: string;
    patientPhone?: string;
    condition?: string;
  }) => {
    const { data } = await axios.post(`${BACKEND_URL}/api/bookings/emergency-sos`, payload, getHeaders());
    return data;
  },

  // Driver actions
  acceptBooking: async (bookingId: string, ambulanceId?: string) => {
    const { data } = await axios.post(`${BACKEND_URL}/api/bookings/accept`, { bookingId, ambulanceId }, getHeaders());
    return data;
  },

  updateBookingStatus: async (bookingId: string, status: 'ACCEPTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED') => {
    const { data } = await axios.post(`${BACKEND_URL}/api/bookings/status`, { bookingId, status }, getHeaders());
    return data;
  },

  toggleDuty: async (ambulanceId?: string, isAvailable?: boolean) => {
    const { data } = await axios.post(`${BACKEND_URL}/api/ambulance/duty-toggle`, { ambulanceId, isAvailable }, getHeaders());
    return data;
  },

  updateLocation: async (payload: { ambulanceId?: string; lat: number; lng: number; heading?: number; address?: string }) => {
    const { data } = await axios.put(`${BACKEND_URL}/api/ambulance/location`, payload, getHeaders());
    return data;
  },

  // History & Tracking
  getPatientBookings: async () => {
    const { data } = await axios.get(`${BACKEND_URL}/api/bookings/my-bookings`, getHeaders());
    return data;
  },

  getDriverTrips: async () => {
    const { data } = await axios.get(`${BACKEND_URL}/api/bookings/driver-trips`, getHeaders());
    return data;
  },

  getBookingById: async (bookingId: string) => {
    const { data } = await axios.get(`${BACKEND_URL}/api/bookings/${bookingId}`, getHeaders());
    return data;
  },
};

export default ambulanceService;
