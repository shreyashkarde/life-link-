export type UserRole = 'PATIENT' | 'DOCTOR' | 'DRIVER' | 'ADMIN_HOSPITAL' | 'SUPER_ADMIN';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  hospitalId?: string | Hospital;
  isActive?: boolean;
}

export interface Hospital {
  _id: string;
  name: string;
  address: string;
  city: string;
  location: {
    lat: number;
    lng: number;
  };
  contactNumber: string;
  emergencyNumber: string;
  totalBeds: number;
  availableBeds: number;
  icuBedsAvailable: number;
  departments: string[];
}

export interface DoctorSlot {
  _id?: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Doctor {
  _id: string;
  userId: User;
  hospitalId?: Hospital;
  specialization: string;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  bio?: string;
  availableSlots: DoctorSlot[];
  averageRating: number;
  reviewCount: number;
  isAvailableToday: boolean;
}

export interface Ambulance {
  _id: string;
  driverId: User;
  hospitalId?: Hospital;
  vehicleNumber: string;
  vehicleModel: string;
  ambulanceType: 'BASIC' | 'ADVANCED_ALS' | 'OXYGEN_BLS';
  isOnline: boolean;
  status: 'AVAILABLE' | 'ON_TRIP' | 'OFFLINE';
  currentLocation: {
    lat: number;
    lng: number;
    address?: string;
    heading?: number;
    speed?: number;
    lastUpdated?: string;
  };
  baseFare: number;
  perKmRate: number;
  averageRating: number;
  totalRides: number;
  equipmentList: string[];
  distanceKm?: number;
  etaMinutes?: number;
  estimatedFare?: number;
}

export interface Appointment {
  _id: string;
  patientId: User;
  doctorId: Doctor;
  hospitalId?: Hospital;
  slotDate: string;
  slotTime: string;
  status: 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  symptoms?: string;
  notes?: string;
  prescription?: string;
  consultationFee: number;
  paymentStatus: 'PENDING' | 'PAID';
  isEmergency: boolean;
  createdAt: string;
}

export interface AmbulanceBooking {
  _id: string;
  patientId: User;
  driverId?: User;
  ambulanceId?: Ambulance;
  hospitalId?: Hospital;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  destinationLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  ambulanceType: 'BASIC' | 'ADVANCED_ALS' | 'OXYGEN_BLS';
  tripType: 'STANDARD' | 'SOS_EMERGENCY';
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'ONGOING'
    | 'ARRIVED_AT_PATIENT'
    | 'ARRIVED_AT_HOSPITAL'
    | 'COMPLETED'
    | 'CANCELLED';
  fare: number;
  distanceKm: number;
  etaMinutes: number;
  driverLiveLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    lastUpdated?: string;
  };
  patientCondition?: string;
  emergencyNotes?: string;
  isSOS: boolean;
  acceptedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface RatingReview {
  _id: string;
  reviewerId: {
    _id: string;
    name: string;
    avatar?: string;
  };
  targetType: 'DOCTOR' | 'DRIVER';
  targetId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
