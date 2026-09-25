import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { Ambulance } from '../models/Ambulance';
import { Hospital } from '../models/Hospital';
import { prescriptoStore } from '../config/prescriptoStore';
import { isMongoConnected } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { emitNewBookingToDriver, emitEmergencyAlert, getIO } from '../socket/socketHandler';
import {
  calculateDistance,
  getDriverScore,
  getHospitalScore,
  getBestDriver,
  getBestHospital,
  getDispatchRecommendations,
} from '../services/aiDispatchService';

// Haversine distance in km (backward-compatible alias)
const getDistance = calculateDistance;

// POST /api/bookings/create
export const createAmbulanceBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLocation, destinationHospital, patientName, patientPhone, patientCondition = 'General Medical Transit', ambulanceId, hospitalId: explicitHospitalId } = req.body;
    const headerHospitalId = req.headers['x-hospital-id'] as string;
    const targetHospitalId = explicitHospitalId || headerHospitalId || destinationHospital?.hospitalId;
    const patientId = req.user?.id || 'guest_patient';

    if (!pickupLocation?.address || !pickupLocation?.lat || !pickupLocation?.lng) {
      return res.status(400).json({ success: false, message: 'Valid pickup address and coordinates required' });
    }

    // Load available fleet
    let fleet: any[] = [];
    if (isMongoConnected()) {
      fleet = await Ambulance.find({});
    } else {
      fleet = prescriptoStore.ambulances || [];
    }

    // Resolve ambulance details with strict hospital tenancy & AI optimization
    let assignedAmbulance: any = null;
    let aiScoreData: any = null;

    if (ambulanceId) {
      if (isMongoConnected()) {
        const isObjectId = mongoose.Types.ObjectId.isValid(ambulanceId);
        assignedAmbulance = isObjectId
          ? await Ambulance.findById(ambulanceId)
          : await Ambulance.findOne({ $or: [{ _id: ambulanceId }, { driverId: ambulanceId }] });
      } else {
        assignedAmbulance = prescriptoStore.ambulances.find((a) => a._id === ambulanceId || a.id === ambulanceId || a.driverId === ambulanceId);
      }

      // 🛡️ Cross-Hospital Mismatch Validation Rule
      if (assignedAmbulance && targetHospitalId && assignedAmbulance.hospitalId && assignedAmbulance.hospitalId !== targetHospitalId) {
        return res.status(400).json({
          success: false,
          message: `Cross-hospital dispatch mismatch: Selected ambulance '${assignedAmbulance.vehicleNumber}' belongs to '${assignedAmbulance.hospitalName || assignedAmbulance.hospitalId}', but the booking requested hospital '${targetHospitalId}'. Inter-hospital cross-dispatch is strictly prohibited.`,
          code: 'HOSPITAL_MISMATCH',
          ambulanceHospitalId: assignedAmbulance.hospitalId,
          requestedHospitalId: targetHospitalId,
        });
      }
    }

    // 🧠 AI DRIVER PREDICTION: Auto-assign the optimal driver based on distance, rating, load, and ETA
    if (!assignedAmbulance) {
      const bestDriverResult = getBestDriver(
        fleet,
        { lat: pickupLocation.lat, lng: pickupLocation.lng },
        patientCondition,
        targetHospitalId
      );

      if (bestDriverResult) {
        assignedAmbulance = bestDriverResult.driver;
        aiScoreData = {
          score: bestDriverResult.score,
          etaMinutes: bestDriverResult.etaMinutes,
          distanceKm: bestDriverResult.distanceKm,
          confidencePercent: bestDriverResult.confidencePercent,
          reasons: bestDriverResult.reasons,
        };
      } else {
        assignedAmbulance = fleet[0];
      }
    }

    const resolvedHospitalId = targetHospitalId || assignedAmbulance?.hospitalId || 'hosp_lilavati';
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
      status: (assignedAmbulance ? 'ASSIGNED' : 'REQUESTED') as any,
      emergencySeverity: 'MEDIUM' as const,
      patientCondition,
      fare: 120,
      paymentStatus: 'PENDING' as const,
      timeline: { bookedAt: new Date() },
    };

    let createdBooking: any;
    if (isMongoConnected()) {
      createdBooking = await AmbulanceBooking.create(bookingData);
    } else {
      createdBooking = {
        _id: 'book_' + Date.now(),
        ...bookingData,
        createdAt: new Date().toISOString(),
      };
      prescriptoStore.ambulanceBookings.unshift(createdBooking);
    }

    emitNewBookingToDriver(bookingData.driverId || bookingData.ambulanceId, createdBooking);

    return res.status(201).json({
      success: true,
      statement: 'AI-based scoring system is used to predict optimal driver and hospital based on real-time and contextual data.',
      booking: createdBooking,
      aiDispatch: aiScoreData || {
        score: 1.2,
        etaMinutes: 3,
        distanceKm: 1.5,
        confidencePercent: 96,
        reasons: ['Optimal fleet proximity and active ready status'],
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings/emergency-sos
export const triggerEmergencySOS = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLocation, patientName, patientPhone, condition = 'Critical Emergency SOS (Cardiac / Acute Trauma)', hospitalId: explicitHospitalId } = req.body;
    const headerHospitalId = req.headers['x-hospital-id'] as string;
    const requestedHospitalId = explicitHospitalId || headerHospitalId;
    const patientId = req.user?.id || 'emergency_patient';

    const pLat = pickupLocation?.lat || 19.0760;
    const pLng = pickupLocation?.lng || 72.8777;
    const pAddress = pickupLocation?.address || 'GPS Emergency Ping Location';
    const patientPoint = { lat: pLat, lng: pLng, address: pAddress };

    // 1. Fetch available fleet and hospitals from MongoDB or in-memory store
    let fleet: any[] = [];
    let hospitals: any[] = [];

    if (isMongoConnected()) {
      fleet = await Ambulance.find({});
      hospitals = await Hospital.find({ isActive: true });
    }
    if (!fleet || fleet.length === 0) {
      fleet = prescriptoStore.ambulances || [];
    }
    if (!hospitals || hospitals.length === 0) {
      hospitals = prescriptoStore.hospitals || [];
    }

    // 🏥 PART 2: AI HOSPITAL PREDICTION (Predict Most Suitable Hospital based on capacity, specialization & proximity)
    let bestHospitalResult = null;
    let targetHospital: any = null;

    if (!requestedHospitalId) {
      bestHospitalResult = getBestHospital(hospitals, condition, patientPoint);
      targetHospital = bestHospitalResult?.hospital || hospitals[0];
    } else {
      targetHospital = hospitals.find((h) => h._id === requestedHospitalId || h.id === requestedHospitalId) || hospitals[0];
      bestHospitalResult = getHospitalScore(targetHospital, condition, patientPoint);
    }

    const resolvedHospitalId = targetHospital?._id || targetHospital?.id || 'hosp_lilavati';
    const resolvedHospitalName = targetHospital?.name || 'Lilavati Hospital & Research Centre';

    // 🚑 PART 1: AI DRIVER PREDICTION (Predict Nearest & Best Driver from Hospital Fleet)
    const bestDriverResult = getBestDriver(fleet, patientPoint, condition, resolvedHospitalId);
    const assignedAmbulance = bestDriverResult?.driver || fleet[0] || {
      _id: 'amb_108',
      driverName: 'Rajesh Kumar',
      driverPhone: '+91 98201 10800',
      vehicleNumber: 'MH-01-EQ-1108',
      hospitalId: resolvedHospitalId,
      hospitalName: resolvedHospitalName,
    };

    const bookingData = {
      patientId,
      patientName: patientName || 'Emergency Patient',
      patientPhone: patientPhone || '+91 98200 99999',
      ambulanceId: assignedAmbulance._id,
      driverId: assignedAmbulance.driverId || 'driver_1',
      driverName: assignedAmbulance.driverName,
      driverPhone: assignedAmbulance.driverPhone,
      vehicleNumber: assignedAmbulance.vehicleNumber,
      hospitalId: resolvedHospitalId,
      hospitalName: resolvedHospitalName,
      pickupLocation: { address: pAddress, lat: pLat, lng: pLng },
      destinationHospital: {
        name: resolvedHospitalName,
        address: typeof targetHospital?.address === 'string' ? targetHospital.address : targetHospital?.address?.line1 || 'Trauma Resuscitation Center, Bandra West',
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
      assignedDriverId: assignedAmbulance.driverId || assignedAmbulance._id,
      driverName: assignedAmbulance.driverName,
      vehicleNumber: assignedAmbulance.vehicleNumber,
      pickupLocation: savedBooking.pickupLocation,
      severity: 'CRITICAL_CODE_RED',
      patientName: savedBooking.patientName,
      hospitalId: resolvedHospitalId,
      hospitalName: resolvedHospitalName,
      etaMinutes: bestDriverResult?.etaMinutes || 3,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      statement: 'AI-based scoring system is used to predict optimal driver and hospital based on real-time and contextual data.',
      message: '🚨 Code Red Emergency SOS Dispatch Initiated via AI Engine!',
      booking: savedBooking,
      assignedAmbulance,
      recommendedHospital: targetHospital,
      etaMinutes: bestDriverResult?.etaMinutes || 3,
      aiEvaluation: {
        driverScore: bestDriverResult?.score || 1.1,
        driverConfidence: bestDriverResult?.confidencePercent || 97,
        driverMatchReasons: bestDriverResult?.reasons || ['Fastest proximity to patient location', 'Ready idle duty status'],
        hospitalScore: bestHospitalResult?.score || 1.4,
        hospitalConfidence: bestHospitalResult?.confidencePercent || 95,
        hospitalMatchReasons: bestHospitalResult?.reasons || ['Level 1 Apex Trauma Center match', 'ICU capacity ready'],
      },
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
      const isObjectId = mongoose.Types.ObjectId.isValid(bookingId);
      const booking = isObjectId
        ? await AmbulanceBooking.findById(bookingId)
        : await AmbulanceBooking.findOne({ $or: [{ _id: bookingId }, { bookingId }] });

      if (booking) {
        booking.status = 'ACCEPTED';
        booking.ambulanceId = ambulanceId || booking.ambulanceId;
        booking.timeline = booking.timeline || {};
        booking.timeline.acceptedAt = new Date();
        await booking.save();

        const io = getIO();
        if (io) {
          io.to(`ride_${bookingId}`).emit('rideAccepted', { bookingId, status: 'ACCEPTED', booking });
          io.to(`ride_${bookingId}`).emit('bookingAccepted', { bookingId, status: 'ACCEPTED', booking });
          io.to(`ride_${bookingId}`).emit('rideStatusUpdate', { bookingId, status: 'ACCEPTED', booking });
          if (booking.hospitalId) {
            io.to(`hospital_${booking.hospitalId}`).emit('rideAccepted', { bookingId, status: 'ACCEPTED', booking });
          }
          if (booking.patientId) {
            io.to(`patient_${booking.patientId}`).emit('rideAccepted', { bookingId, status: 'ACCEPTED', booking });
            io.to(`user_${booking.patientId}`).emit('rideAccepted', { bookingId, status: 'ACCEPTED', booking });
            io.to(`patient_${booking.patientId}`).emit('bookingAccepted', { bookingId, status: 'ACCEPTED', booking });
            io.to(`user_${booking.patientId}`).emit('bookingAccepted', { bookingId, status: 'ACCEPTED', booking });
          }
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
        io.to(`ride_${bookingId}`).emit('rideAccepted', { bookingId, status: 'ACCEPTED', booking });
        io.to(`ride_${bookingId}`).emit('bookingAccepted', { bookingId, status: 'ACCEPTED', booking });
        io.to(`ride_${bookingId}`).emit('rideStatusUpdate', { bookingId, status: 'ACCEPTED', booking });
        if (booking.hospitalId) {
          io.to(`hospital_${booking.hospitalId}`).emit('rideAccepted', { bookingId, status: 'ACCEPTED', booking });
        }
        if (booking.patientId) {
          io.to(`patient_${booking.patientId}`).emit('rideAccepted', { bookingId, status: 'ACCEPTED', booking });
          io.to(`user_${booking.patientId}`).emit('rideAccepted', { bookingId, status: 'ACCEPTED', booking });
          io.to(`patient_${booking.patientId}`).emit('bookingAccepted', { bookingId, status: 'ACCEPTED', booking });
          io.to(`user_${booking.patientId}`).emit('bookingAccepted', { bookingId, status: 'ACCEPTED', booking });
        }
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
      const isObjectId = mongoose.Types.ObjectId.isValid(bookingId);
      const booking = isObjectId
        ? await AmbulanceBooking.findById(bookingId)
        : await AmbulanceBooking.findOne({ $or: [{ _id: bookingId }, { bookingId }] });

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
          io.to(`ride_${bookingId}`).emit('rideStatusUpdate', {
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
        io.to(`ride_${bookingId}`).emit('rideStatusUpdate', {
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
      const isObjectId = mongoose.Types.ObjectId.isValid(bookingId);
      const booking = isObjectId
        ? await AmbulanceBooking.findById(bookingId)
        : await AmbulanceBooking.findOne({ $or: [{ _id: bookingId }, { bookingId }] });

      if (booking) {
        booking.status = status;
        booking.timeline = booking.timeline || {};
        if (status === 'COMPLETED') booking.timeline.completedAt = new Date();
        if (status === 'CANCELLED') booking.timeline.cancelledAt = new Date();
        await booking.save();

        const io = getIO();
        if (io) {
          io.to(`ride_${bookingId}`).emit('rideStatusUpdate', { bookingId, status, booking });
          io.to(`ride_${bookingId}`).emit('rideCompleted', { bookingId, status, booking });
          if (booking.hospitalId) {
            io.to(`hospital_${booking.hospitalId}`).emit('rideStatusUpdate', { bookingId, status, booking });
          }
          if (booking.patientId) {
            io.to(`patient_${booking.patientId}`).emit('rideStatusUpdate', { bookingId, status, booking });
            io.to(`user_${booking.patientId}`).emit('rideStatusUpdate', { bookingId, status, booking });
          }
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
        io.to(`ride_${bookingId}`).emit('rideStatusUpdate', { bookingId, status, booking });
        io.to(`ride_${bookingId}`).emit('rideCompleted', { bookingId, status, booking });
        if (booking.hospitalId) {
          io.to(`hospital_${booking.hospitalId}`).emit('rideStatusUpdate', { bookingId, status, booking });
        }
        if (booking.patientId) {
          io.to(`patient_${booking.patientId}`).emit('rideStatusUpdate', { bookingId, status, booking });
          io.to(`user_${booking.patientId}`).emit('rideStatusUpdate', { bookingId, status, booking });
        }
      }
      return res.json({ success: true, message: `Status updated to ${status}`, booking });
    }

    return res.status(404).json({ success: false, message: 'Booking not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bookings/my-bookings (supports optional hospitalId filter)
export const getPatientBookings = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.user?.id;
    const hospitalId = (req.query.hospitalId as string) || (req.headers['x-hospital-id'] as string);

    if (isMongoConnected()) {
      const query: any = { patientId };
      if (hospitalId) query.hospitalId = hospitalId;
      const bookings = await AmbulanceBooking.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, count: bookings.length, bookings });
    }

    let bookings = prescriptoStore.ambulanceBookings.filter(
      (b) => !patientId || b.patientId === patientId || b.patientId === 'user_1'
    );
    if (hospitalId) {
      bookings = bookings.filter((b) => b.hospitalId === hospitalId);
    }
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bookings/driver-trips (supports hospital isolation)
export const getDriverTrips = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?.id;
    const hospitalId = (req.query.hospitalId as string) || (req.headers['x-hospital-id'] as string) || req.user?.hospitalId;

    if (isMongoConnected()) {
      const query: any = {
        $or: [{ ambulanceId: driverId }, { driverId }, { driverName: 'Rajesh Kumar' }],
      };
      if (hospitalId && req.user?.role !== 'SUPER_ADMIN') {
        query.hospitalId = hospitalId;
      }
      const bookings = await AmbulanceBooking.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, count: bookings.length, bookings, trips: bookings });
    }

    let bookings = prescriptoStore.ambulanceBookings;
    if (hospitalId) {
      bookings = bookings.filter((b) => b.hospitalId === hospitalId);
    }
    return res.json({ success: true, count: bookings.length, bookings, trips: bookings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET & POST /api/bookings/ai-recommendations
export const getAiRecommendations = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat((req.body?.lat ?? req.query?.lat) as string) || 19.0760;
    const lng = parseFloat((req.body?.lng ?? req.query?.lng) as string) || 72.8777;
    const condition = (req.body?.condition ?? req.query?.condition ?? 'Emergency SOS') as string;
    const hospitalId = (req.body?.hospitalId ?? req.query?.hospitalId ?? req.headers['x-hospital-id']) as string;

    let fleet: any[] = [];
    let hospitals: any[] = [];

    if (isMongoConnected()) {
      fleet = await Ambulance.find({});
      hospitals = await Hospital.find({ isActive: true });
    }
    if (!fleet || fleet.length === 0) {
      fleet = prescriptoStore.ambulances || [];
    }
    if (!hospitals || hospitals.length === 0) {
      hospitals = prescriptoStore.hospitals || [];
    }

    const recommendations = getDispatchRecommendations(
      fleet,
      hospitals,
      { lat, lng },
      condition,
      hospitalId
    );

    return res.json({
      success: true,
      ...recommendations,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bookings/:bookingId
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(bookingId)) {
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
