import { Application } from 'express';
import trackingRouter from './tracking/trackingRoutes';
import hospitalRouter from './hospitals/hospitalRoutes';
import notificationRouter from './notifications/notificationRoutes';
import authEnhancementsRouter from './auth/authEnhancementsRoutes';
import appointmentSocketRouter from './appointments/appointmentSocketService';
import secureAuthRouter from './auth/secureAuthRoutes';
import privacyRouter from './privacy/privacyRoutes';

import locationRouter from '../routes/location';
import roleRouter from './roleBasedRoutes';

/**
 * Clean, modular plug-and-play feature registration
 * Mounts all newly added endpoints in an isolated, additive manner.
 */
export const registerModularFeatures = (app: Application) => {
  // 1. Live Ambulance Tracking (/api/tracking/live)
  app.use('/api/tracking', trackingRouter);

  // 2. Nearby Hospital Finder (/api/hospitals/nearby)
  app.use('/api/hospitals', hospitalRouter);

  // 3. Notification System (/api/notifications)
  app.use('/api/notifications', notificationRouter);

  // 4. Auth Enhancements (/api/auth/google-login, /api/auth/forgot-password)
  app.use('/api/auth', authEnhancementsRouter);

  // 5. Real-Time Room-Based Appointments Engine (/api/realtime-appointments)
  app.use('/api/realtime-appointments', appointmentSocketRouter);

  // 6. Enterprise Token-Based Authentication & Refresh (/api/auth/token-login, /api/auth/refresh, /api/auth/logout)
  app.use('/api/auth', secureAuthRouter);

  // 7. Strict Dashboard Privacy & Data Isolation (/api/privacy/patient/*, /api/privacy/doctor/*, /api/privacy/admin/*)
  app.use('/api/privacy', privacyRouter);

  // 8. Dynamic GPS Location Engine (/api/location/update, /api/location/:userId, /api/location/trip/:bookingId)
  app.use('/api/location', locationRouter);

  // 9. Strict Role-Based Healthcare & Ambulance System (/api/system/*, /api/hospital/*, /api/driver/*, /api/doctor/*, /api/patient/*)
  app.use('/api', roleRouter);

  console.log('[Modular Features] Advanced modules registered: Tracking, Hospitals, Notifications, Auth Enhancements, Rate Limiter, Realtime Appointments, Secure Auth, Dashboard Privacy, Dynamic Location, Strict Roles.');
};

export default registerModularFeatures;
