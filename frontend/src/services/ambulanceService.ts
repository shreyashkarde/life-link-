import apiClient from './apiClient';

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
    const { data } = await apiClient.get(`/api/ambulance/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    return data;
  },

  getAllAmbulances: async () => {
    const { data } = await apiClient.get(`/api/ambulance/all`);
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
    const { data } = await apiClient.post(`/api/bookings/create`, payload);
    return data;
  },

  // One-Click Emergency SOS Dispatch
  triggerEmergencySOS: async (payload: {
    pickupLocation?: { address: string; lat: number; lng: number };
    patientName?: string;
    patientPhone?: string;
    condition?: string;
  }) => {
    const { data } = await apiClient.post(`/api/bookings/emergency-sos`, payload);
    return data;
  },

  // Driver actions
  acceptBooking: async (bookingId: string, ambulanceId?: string) => {
    const { data } = await apiClient.post(`/api/bookings/accept`, { bookingId, ambulanceId });
    return data;
  },

  updateBookingStatus: async (bookingId: string, status: 'ACCEPTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED') => {
    const { data } = await apiClient.post(`/api/bookings/status`, { bookingId, status });
    return data;
  },

  toggleDuty: async (ambulanceId?: string, isAvailable?: boolean) => {
    const { data } = await apiClient.post(`/api/ambulance/duty-toggle`, { ambulanceId, isAvailable });
    return data;
  },

  updateLocation: async (payload: { ambulanceId?: string; lat: number; lng: number; heading?: number; address?: string }) => {
    const { data } = await apiClient.put(`/api/ambulance/location`, payload);
    return data;
  },

  // History & Tracking
  getPatientBookings: async () => {
    const { data } = await apiClient.get(`/api/bookings/my-bookings`);
    return data;
  },

  getDriverTrips: async () => {
    const { data } = await apiClient.get(`/api/bookings/driver-trips`);
    return data;
  },

  getBookingById: async (bookingId: string) => {
    const { data } = await apiClient.get(`/api/bookings/${bookingId}`);
    return data;
  },
};

export default ambulanceService;
