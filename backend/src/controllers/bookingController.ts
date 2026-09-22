import { Response } from 'express';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { Ambulance } from '../models/Ambulance';
import { AuthRequest } from '../middleware/auth';
import { calculateDistanceKm } from './ambulanceController';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

// Create a new Ambulance Booking
export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pickupLocation, destinationLocation, ambulanceType = 'BASIC', patientCondition } = req.body;
    const u = req.user;

    if (!isMongoConnected()) {
      const amb = memoryStore.ambulances.find((a) => a.isOnline && a.ambulanceType === ambulanceType) || memoryStore.ambulances[0];
      const distanceKm = 3.5;
      const fare = 499;

      const newBooking: any = {
        _id: `book_${Date.now()}`,
        id: `book_${Date.now()}`,
        patientId: u,
        driverId: amb.driverId,
        ambulanceId: amb,
        pickupLocation,
        destinationLocation: destinationLocation || {
          lat: 19.0668,
          lng: 72.8682,
          address: 'LifeLink Central Trauma Hospital',
        },
        ambulanceType,
        tripType: 'STANDARD',
        status: 'PENDING',
        fare,
        distanceKm,
        etaMinutes: 6,
        patientCondition: patientCondition || 'Stable',
        createdAt: new Date().toISOString(),
      };

      memoryStore.bookings.unshift(newBooking);
      res.status(201).json({ success: true, message: 'Ambulance booking request created', booking: newBooking });
      return;
    }

    let assignedDriverId = null;
    let assignedAmbulanceId = null;

    const nearestAmbulance = await Ambulance.findOne({
      isOnline: true,
      status: 'AVAILABLE',
      ambulanceType: ambulanceType || 'BASIC',
    });

    if (nearestAmbulance) {
      assignedDriverId = nearestAmbulance.driverId;
      assignedAmbulanceId = nearestAmbulance._id;
    }

    const booking = await AmbulanceBooking.create({
      patientId: req.user._id,
      driverId: assignedDriverId || undefined,
      ambulanceId: assignedAmbulanceId || undefined,
      pickupLocation,
      destinationLocation: destinationLocation || {
        lat: 19.076,
        lng: 72.8777,
        address: 'Lifelink Central Trauma Hospital',
      },
      ambulanceType,
      tripType: 'STANDARD',
      status: 'PENDING',
      fare: 499,
      distanceKm: 3.5,
      etaMinutes: 7,
      patientCondition: patientCondition || 'Stable',
      isSOS: false,
    });

    const populatedBooking = await AmbulanceBooking.findById(booking._id)
      .populate('patientId', 'name email phone avatar')
      .populate('driverId', 'name email phone avatar')
      .populate('ambulanceId');

    res.status(201).json({
      success: true,
      message: 'Ambulance booking request created',
      booking: populatedBooking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create booking' });
  }
};

// 1-Click Instant Emergency SOS Booking
export const createSOSBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pickupLocation, emergencyNotes } = req.body;
    const lat = pickupLocation?.lat || 19.076;
    const lng = pickupLocation?.lng || 72.8777;
    const address = pickupLocation?.address || 'Current Patient GPS Location (Emergency)';
    const u = req.user;

    if (!isMongoConnected()) {
      const amb = memoryStore.ambulances.find((a) => a.ambulanceType === 'ADVANCED_ALS') || memoryStore.ambulances[0];
      const newBooking: any = {
        _id: `sos_${Date.now()}`,
        id: `sos_${Date.now()}`,
        patientId: u,
        driverId: amb.driverId,
        ambulanceId: amb,
        pickupLocation: { lat, lng, address },
        destinationLocation: {
          lat: 19.0668,
          lng: 72.8682,
          address: 'LifeLink Emergency Trauma & Resuscitation Center',
        },
        ambulanceType: amb.ambulanceType || 'ADVANCED_ALS',
        tripType: 'SOS_EMERGENCY',
        status: 'ACCEPTED',
        fare: 599,
        distanceKm: 2.1,
        etaMinutes: 4,
        isSOS: true,
        emergencyNotes: emergencyNotes || 'CRITICAL EMERGENCY: 1-Click SOS Dispatch Triggered',
        createdAt: new Date().toISOString(),
      };

      memoryStore.bookings.unshift(newBooking);
      res.status(201).json({
        success: true,
        message: '🚨 Emergency SOS Ambulance Dispatched Successfully!',
        booking: newBooking,
      });
      return;
    }

    let selectedAmbulance = await Ambulance.findOne({
      isOnline: true,
      status: 'AVAILABLE',
      ambulanceType: 'ADVANCED_ALS',
    });

    if (!selectedAmbulance) {
      selectedAmbulance = await Ambulance.findOne({ isOnline: true, status: 'AVAILABLE' });
    }
    if (!selectedAmbulance) {
      selectedAmbulance = await Ambulance.findOne();
    }

    const booking = await AmbulanceBooking.create({
      patientId: req.user._id,
      driverId: selectedAmbulance?.driverId,
      ambulanceId: selectedAmbulance?._id,
      pickupLocation: { lat, lng, address },
      destinationLocation: {
        lat: 19.082,
        lng: 72.889,
        address: 'Lifelink Emergency Trauma & Resuscitation Center',
      },
      ambulanceType: selectedAmbulance?.ambulanceType || 'ADVANCED_ALS',
      tripType: 'SOS_EMERGENCY',
      status: 'ACCEPTED',
      fare: 599,
      distanceKm: 2.5,
      etaMinutes: 5,
      isSOS: true,
      emergencyNotes: emergencyNotes || 'CRITICAL EMERGENCY: 1-Click SOS Dispatch Triggered',
      acceptedAt: new Date(),
    });

    const populatedBooking = await AmbulanceBooking.findById(booking._id)
      .populate('patientId', 'name email phone avatar')
      .populate('driverId', 'name email phone avatar')
      .populate('ambulanceId');

    res.status(201).json({
      success: true,
      message: '🚨 Emergency SOS Ambulance Dispatched Successfully!',
      booking: populatedBooking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to dispatch SOS ambulance' });
  }
};

// Driver: Accept / Reject Booking
export const driverResponseBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!isMongoConnected()) {
      const b = memoryStore.bookings.find((item) => item._id === id || item.id === id);
      if (b) {
        b.status = action === 'ACCEPT' ? 'ACCEPTED' : 'CANCELLED';
      }
      res.json({ success: true, message: `Booking ${action === 'ACCEPT' ? 'Accepted' : 'Rejected'}`, booking: b });
      return;
    }

    const booking = await AmbulanceBooking.findById(id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    booking.status = action === 'ACCEPT' ? 'ACCEPTED' : 'CANCELLED';
    if (action === 'ACCEPT') {
      booking.driverId = req.user._id;
      booking.acceptedAt = new Date();
    }

    await booking.save();
    const updated = await AmbulanceBooking.findById(id)
      .populate('patientId', 'name email phone avatar')
      .populate('driverId', 'name email phone avatar')
      .populate('ambulanceId');

    res.json({ success: true, message: `Booking updated`, booking: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update booking' });
  }
};

// Update Booking Status
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, driverLiveLocation } = req.body;

    if (!isMongoConnected()) {
      const b = memoryStore.bookings.find((item) => item._id === id || item.id === id);
      if (b) {
        if (status) b.status = status;
        if (driverLiveLocation) b.driverLiveLocation = driverLiveLocation;
      }
      res.json({ success: true, message: `Booking status updated to ${status}`, booking: b });
      return;
    }

    const booking = await AmbulanceBooking.findById(id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (status) booking.status = status;
    if (driverLiveLocation) booking.driverLiveLocation = driverLiveLocation;

    await booking.save();
    const updated = await AmbulanceBooking.findById(id)
      .populate('patientId', 'name email phone avatar')
      .populate('driverId', 'name email phone avatar')
      .populate('ambulanceId');

    res.json({ success: true, message: `Booking status updated to ${status}`, booking: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update ride status' });
  }
};

// Get Live Booking Tracking info
export const getBookingById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isMongoConnected()) {
      const b = memoryStore.bookings.find((item) => item._id === id || item.id === id) || memoryStore.bookings[0];
      res.json({ success: true, booking: b });
      return;
    }

    const booking = await AmbulanceBooking.findById(id)
      .populate('patientId', 'name email phone avatar')
      .populate('driverId', 'name email phone avatar')
      .populate('ambulanceId')
      .populate('hospitalId', 'name address contactNumber emergencyNumber');

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    res.json({ success: true, booking });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch booking' });
  }
};

// Patient Bookings history
export const getPatientBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uId = req.user?._id || req.user?.id;

    if (!isMongoConnected()) {
      res.json({ success: true, count: memoryStore.bookings.length, bookings: memoryStore.bookings });
      return;
    }

    const bookings = await AmbulanceBooking.find({ patientId: req.user._id })
      .populate('driverId', 'name email phone avatar')
      .populate('ambulanceId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch bookings' });
  }
};

// Driver Trips
export const getDriverBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      res.json({ success: true, count: memoryStore.bookings.length, bookings: memoryStore.bookings });
      return;
    }

    const bookings = await AmbulanceBooking.find({ driverId: req.user._id })
      .populate('patientId', 'name email phone avatar')
      .populate('ambulanceId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch driver bookings' });
  }
};
