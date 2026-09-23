import { Request, Response } from 'express';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { Ambulance } from '../models/Ambulance';
import { prescriptoStore } from '../config/prescriptoStore';
import { isMongoConnected } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { emitNewBookingToDriver, emitEmergencyAlert, getIO } from '../socket/socketHandler';

// Haversine distance in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// POST /api/bookings/create
export const createAmbulanceBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLocation, destinationHospital, patientName, patientPhone, patientCondition, ambulanceId, hospitalId } = req.body;
    const patientId = req.user?.id || 'guest_patient';

    if (!pickupLocation?.address || !pickupLocation?.lat || !pickupLocation?.lng) {
      return res.status(400).json({ success: false, message: 'Valid pickup address and coordinates required' });
    }

    // Resolve ambulance details
    let assignedAmbulance: any = null;
    if (isMongoConnected()) {
      if (ambulanceId) {
        assignedAmbulance = await Ambulance.findById(ambulanceId);
      }
      if (!assignedAmbulance && hospitalId) {
        assignedAmbulance = await Ambulance.findOne({ hospitalId, isAvailable: true });
      }
      if (!assignedAmbulance) {
        assignedAmbulance = await Ambulance.findOne({ isAvailable: true }) || await Ambulance.findOne();
      }
    } else {
      if (ambulanceId) {
        assignedAmbulance = prescriptoStore.ambulances.find((a) => a._id === ambulanceId || a.id === ambulanceId);
      }
      if (!assignedAmbulance && hospitalId) {
        assignedAmbulance = prescriptoStore.ambulances.find((a) => a.hospitalId === hospitalId);
      }
      if (!assignedAmbulance) {
        assignedAmbulance = prescriptoStore.ambulances[0];
      }
    }

    const resolvedHospitalId = assignedAmbulance?.hospitalId || hospitalId || 'hosp_lilavati';
    const resolvedHospitalName = assignedAmbulance?.hospitalName || assignedAmbulance?.assignedHospital || 'Lilavati Hospital & Research Centre';

    const bookingData = {
      patientId,
      patientName: patientName || req.user?.email?.split('@')[0] || 'Patient',
      patientPhone: patientPhone || '+91 98200 00000',
      ambulanceId: assignedAmbulance?._id || ambulanceId || 'amb_108',
      driverId: assignedAmbulance?.driverId || 'driver_1',
      driverName: assignedAmbulance?.driverName || 'Rajesh Kumar',
      driverPhone: assignedAmbulance?.driverPhone || '+91 98201 10800',
      vehicleNumber: assignedAmbulance?.vehicleNumber || 'MH-01-EQ-1108',
      hospitalId: resolvedHospitalId,
      hospitalName: resolvedHospitalName,
      pickupLocation,
      destinationHospital: destinationHospital || {
        name: resolvedHospitalName,
        address: 'Trauma Bay & Emergency Care, Sector 4',
        lat: 19.0544,
        lng: 72.8277,
      },
      bookingType: 'NORMAL' as const,
      status: 'PENDING' as const,
      emergencySeverity: 'MEDIUM' as const,
      patientCondition: patientCondition || 'General Medical Transit',
      fare: 120,
      paymentStatus: 'PENDING' as const,
      timeline: { bookedAt: new Date() },
    };

    if (isMongoConnected()) {
      const booking = await AmbulanceBooking.create(bookingData);
      emitNewBookingToDriver(bookingData.driverId || bookingData.ambulanceId, booking);
      return res.status(201).json({ success: true, booking });
    }

    const createdBooking = {
      _id: 'book_' + Date.now(),
      ...bookingData,
      createdAt: new Date().toISOString(),
    };
    prescriptoStore.ambulanceBookings.unshift(createdBooking);

    emitNewBookingToDriver(bookingData.driverId || bookingData.ambulanceId, createdBooking);
    return res.status(201).json({ success: true, booking: createdBooking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings/emergency-sos
export const triggerEmergencySOS = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLocation, patientName, patientPhone, condition = 'Critical Emergency SOS' } = req.body;
    const patientId = req.user?.id || 'emergency_patient';

    const pLat = pickupLocation?.lat || 19.0760;
    const pLng = pickupLocation?.lng || 72.8777;
    const pAddress = pickupLocation?.address || 'GPS Emergency Ping Location';

    // Auto-detect nearest available driver
    let fleet: any[] = [];
    if (isMongoConnected()) {
      fleet = await Ambulance.find({ isAvailable: true });
    }
    if (!fleet || fleet.length === 0) {
      fleet = prescriptoStore.ambulances.filter((a) => a.isAvailable !== false);
    }

    let nearestAmbulance = fleet[0] || {
      _id: 'amb_108',
      driverName: 'Rajesh Kumar',
      driverPhone: '+91 98201 10800',
      vehicleNumber: 'MH-01-EQ-1108',
    };

    let minDistance = Infinity;
    fleet.forEach((amb) => {
      const dist = getDistance(pLat, pLng, amb.currentLocation?.lat || 19.076, amb.currentLocation?.lng || 72.877);
      if (dist < minDistance) {
        minDistance = dist;
        nearestAmbulance = amb;
      }
    });

    const bookingData = {
      patientId,
      patientName: patientName || 'Emergency Patient',
      patientPhone: patientPhone || '+91 98200 99999',
      ambulanceId: nearestAmbulance._id,
      driverId: nearestAmbulance.driverId || 'driver_1',
      driverName: nearestAmbulance.driverName,
      driverPhone: nearestAmbulance.driverPhone,
      vehicleNumber: nearestAmbulance.vehicleNumber,
      hospitalId: nearestAmbulance.hospitalId || 'hosp_lilavati',
      hospitalName: nearestAmbulance.hospitalName || nearestAmbulance.assignedHospital || 'Lilavati Hospital & Research Centre',
      pickupLocation: { address: pAddress, lat: pLat, lng: pLng },
      destinationHospital: {
        name: nearestAmbulance.hospitalName || nearestAmbulance.assignedHospital || 'Lilavati Hospital & Research Centre',
        address: 'Trauma Resuscitation Center, Bandra West',
        lat: 19.0544,
        lng: 72.8277,
      },
      bookingType: 'EMERGENCY_SOS' as const,
      status: 'ACCEPTED' as const, // Auto-accept / priority dispatch
      emergencySeverity: 'CRITICAL_CODE_RED' as const,
      patientCondition: condition,
      fare: 150,
      paymentStatus: 'PENDING' as const,
      timeline: {
        bookedAt: new Date(),
        acceptedAt: new Date(),
      },
    };

    let savedBooking: any;
    if (isMongoConnected()) {
      savedBooking = await AmbulanceBooking.create(bookingData);
    } else {
      savedBooking = {
        _id: 'sos_' + Date.now(),
        ...bookingData,
        createdAt: new Date().toISOString(),
      };
      prescriptoStore.ambulanceBookings.unshift(savedBooking);
    }

    // High Priority Real-time Socket Dispatch
    emitEmergencyAlert({
      bookingId: savedBooking._id,
      assignedDriverId: nearestAmbulance.driverId || nearestAmbulance._id,
      driverName: nearestAmbulance.driverName,
      vehicleNumber: nearestAmbulance.vehicleNumber,
      pickupLocation: savedBooking.pickupLocation,
      severity: 'CRITICAL_CODE_RED',
      patientName: savedBooking.patientName,
      etaMinutes: Math.max(3, Math.round(minDistance * 2.5 + 1)),
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: '🚨 Code Red Emergency SOS Dispatch Initiated!',
      booking: savedBooking,
      assignedAmbulance: nearestAmbulance,
      etaMinutes: Math.max(3, Math.round(minDistance * 2.5 + 1)),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings/accept
export const acceptBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, ambulanceId } = req.body;

    if (isMongoConnected()) {
      const booking = await AmbulanceBooking.findById(bookingId);
      if (booking) {
        booking.status = 'ACCEPTED';
        booking.ambulanceId = ambulanceId || booking.ambulanceId;
        booking.timeline = booking.timeline || {};
        booking.timeline.acceptedAt = new Date();
        await booking.save();

        const io = getIO();
        if (io) {
          io.to(`ride_${bookingId}`).emit('bookingAccepted', { bookingId, status: 'ACCEPTED' });
        }
        return res.json({ success: true, message: 'Booking accepted', booking });
      }
    }

    const booking = prescriptoStore.ambulanceBookings.find((b) => b._id === bookingId);
    if (booking) {
      booking.status = 'ACCEPTED';
      booking.timeline = booking.timeline || {};
      booking.timeline.acceptedAt = new Date();

      const io = getIO();
      if (io) {
        io.to(`ride_${bookingId}`).emit('bookingAccepted', { bookingId, status: 'ACCEPTED' });
      }
      return res.json({ success: true, message: 'Booking accepted', booking });
    }

    return res.status(404).json({ success: false, message: 'Booking not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings/reject
export const rejectBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, reason } = req.body;

    if (isMongoConnected()) {
      const booking = await AmbulanceBooking.findById(bookingId);
      if (booking) {
        booking.status = 'REJECTED';
        booking.timeline = booking.timeline || {};
        booking.timeline.rejectedAt = new Date();
        await booking.save();

        const io = getIO();
        if (io) {
          io.to(`ride_${bookingId}`).emit('bookingRejected', {
            bookingId,
            status: 'REJECTED',
            reason: reason || 'Driver unavailable',
          });
        }
        return res.json({ success: true, message: 'Booking rejected', booking });
      }
    }

    const booking = prescriptoStore.ambulanceBookings.find((b) => b._id === bookingId);
    if (booking) {
      booking.status = 'REJECTED';
      booking.timeline = booking.timeline || {};
      booking.timeline.rejectedAt = new Date();

      const io = getIO();
      if (io) {
        io.to(`ride_${bookingId}`).emit('bookingRejected', {
          bookingId,
          status: 'REJECTED',
          reason: reason || 'Driver unavailable',
        });
      }
      return res.json({ success: true, message: 'Booking rejected', booking });
    }

    return res.status(404).json({ success: false, message: 'Booking not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings/status
export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, status } = req.body;

    if (isMongoConnected()) {
      const booking = await AmbulanceBooking.findById(bookingId);
      if (booking) {
        booking.status = status;
        booking.timeline = booking.timeline || {};
        if (status === 'COMPLETED') booking.timeline.completedAt = new Date();
        if (status === 'CANCELLED') booking.timeline.cancelledAt = new Date();
        await booking.save();

        const io = getIO();
        if (io) {
          io.to(`ride_${bookingId}`).emit('rideCompleted', { bookingId, status });
        }
        return res.json({ success: true, message: `Status updated to ${status}`, booking });
      }
    }

    const booking = prescriptoStore.ambulanceBookings.find((b) => b._id === bookingId);
    if (booking) {
      booking.status = status;
      booking.timeline = booking.timeline || {};
      if (status === 'COMPLETED') booking.timeline.completedAt = new Date();
      if (status === 'CANCELLED') booking.timeline.cancelledAt = new Date();

      const io = getIO();
      if (io) {
        io.to(`ride_${bookingId}`).emit('rideCompleted', { bookingId, status });
      }
      return res.json({ success: true, message: `Status updated to ${status}`, booking });
    }

    return res.status(404).json({ success: false, message: 'Booking not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bookings/my-bookings
export const getPatientBookings = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.user?.id;

    if (isMongoConnected()) {
      const bookings = await AmbulanceBooking.find({ patientId }).sort({ createdAt: -1 });
      return res.json({ success: true, bookings });
    }

    const bookings = prescriptoStore.ambulanceBookings.filter(
      (b) => !patientId || b.patientId === patientId || b.patientId === 'user_1'
    );
    return res.json({ success: true, bookings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bookings/driver-trips
export const getDriverTrips = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?.id;

    if (isMongoConnected()) {
      const bookings = await AmbulanceBooking.find({
        $or: [{ ambulanceId: driverId }, { driverName: 'Rajesh Kumar' }],
      }).sort({ createdAt: -1 });
      return res.json({ success: true, bookings });
    }

    return res.json({ success: true, bookings: prescriptoStore.ambulanceBookings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bookings/:bookingId
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    if (isMongoConnected()) {
      const booking = await AmbulanceBooking.findById(bookingId);
      if (booking) return res.json({ success: true, booking });
    }

    const booking = prescriptoStore.ambulanceBookings.find((b) => b._id === bookingId);
    if (booking) return res.json({ success: true, booking });

    return res.status(404).json({ success: false, message: 'Booking not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
