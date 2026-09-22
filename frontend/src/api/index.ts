import api from './axios';

// Auth Endpoints
export const authAPI = {
  login: (data: { email: string; password?: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  googleLogin: (data: any) => api.post('/auth/google', data),
  getProfile: () => api.get('/auth/profile'),
};

// Doctors Endpoints
export const doctorAPI = {
  getAll: (params?: { specialization?: string; search?: string; minRating?: number }) =>
    api.get('/doctors', { params }),
  getById: (id: string) => api.get(`/doctors/${id}`),
  updateProfile: (data: any) => api.put('/doctors/profile/update', data),
  updateSlots: (slots: any[]) => api.put('/doctors/slots/update', { slots }),
  getDashboardStats: () => api.get('/doctors/dashboard/stats'),
};

// Appointments Endpoints
export const appointmentAPI = {
  book: (data: { doctorId: string; slotDate: string; slotTime: string; symptoms?: string; notes?: string }) =>
    api.post('/appointments/book', data),
  getPatientAppointments: () => api.get('/appointments/patient'),
  getDoctorAppointments: () => api.get('/appointments/doctor'),
  updateStatus: (id: string, data: { status?: string; prescription?: string; notes?: string }) =>
    api.put(`/appointments/${id}/status`, data),
};

// Ambulances Endpoints
export const ambulanceAPI = {
  getNearby: (params?: { lat?: number; lng?: number; type?: string }) =>
    api.get('/ambulances/nearby', { params }),
  getDriverProfile: () => api.get('/ambulances/driver/profile'),
  toggleDriverStatus: (data: { isOnline?: boolean; status?: string }) =>
    api.put('/ambulances/driver/status', data),
  updateLocation: (data: { lat: number; lng: number; heading?: number; speed?: number; address?: string }) =>
    api.put('/ambulances/driver/location', data),
};

// Bookings Endpoints
export const bookingAPI = {
  create: (data: any) => api.post('/bookings/create', data),
  createSOS: (data: { pickupLocation: { lat: number; lng: number; address: string }; emergencyNotes?: string }) =>
    api.post('/bookings/emergency-sos', data),
  getById: (id: string) => api.get(`/bookings/${id}`),
  getPatientHistory: () => api.get('/bookings/patient/history'),
  getDriverHistory: () => api.get('/bookings/driver/history'),
  driverResponse: (id: string, action: 'ACCEPT' | 'REJECT') =>
    api.put(`/bookings/${id}/driver-response`, { action }),
  updateStatus: (id: string, data: { status?: string; driverLiveLocation?: any }) =>
    api.put(`/bookings/${id}/status`, data),
};

// Ratings Endpoints
export const ratingAPI = {
  create: (data: { targetType: 'DOCTOR' | 'DRIVER'; targetId: string; rating: number; comment?: string; bookingId?: string; appointmentId?: string }) =>
    api.post('/ratings/create', data),
  getByTarget: (targetType: string, targetId: string) =>
    api.get(`/ratings/${targetType}/${targetId}`),
};

// Admin Endpoints
export const adminAPI = {
  getHospitalStats: () => api.get('/admin/hospital/stats'),
  getSuperAdminStats: () => api.get('/admin/super/stats'),
  getAllUsers: (params?: { role?: string; search?: string; page?: number }) =>
    api.get('/admin/users', { params }),
  toggleUserStatus: (id: string) => api.put(`/admin/users/${id}/toggle-status`),
  saveHospital: (data: any, id?: string) =>
    id ? api.put(`/admin/hospital/${id}`, data) : api.post('/admin/hospital', data),
};
