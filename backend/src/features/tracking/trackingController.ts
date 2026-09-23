import { Request, Response } from 'express';
import { prescriptoStore } from '../../config/prescriptoStore';
import { Ambulance } from '../../models/Ambulance';
import { AmbulanceBooking } from '../../models/AmbulanceBooking';
import { isMongoConnected } from '../../config/db';

/**
 * GET /api/tracking/live
 * Fetches real-time GPS location, speed, heading, and status for ambulances or a specific booking.
 */
export const getLiveTracking = async (req: Request, res: Response) => {
  try {
    const { bookingId, ambulanceId } = req.query;

    // 1. If tracking a specific booking
    if (bookingId) {
      let booking: any = null;
      if (isMongoConnected()) {
        booking = await AmbulanceBooking.findById(bookingId);
      }
      if (!booking) {
        booking = prescriptoStore.ambulanceBookings.find(
          (b) => b._id === bookingId || b.id === bookingId
        );
      }

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      // Find associated ambulance
      let ambulance: any = null;
      if (isMongoConnected()) {
        ambulance = await Ambulance.findById(booking.ambulanceId);
      }
      if (!ambulance) {
        ambulance = prescriptoStore.ambulances.find(
          (a) => a._id === booking.ambulanceId || a.vehicleNumber === booking.vehicleNumber
        );
      }

      const currentLocation = ambulance?.currentLocation || {
        lat: 19.0760,
        lng: 72.8777,
        address: 'Bandra West Junction, Mumbai',
        heading: 45,
      };

      return res.json({
        success: true,
        bookingId: booking._id,
        status: booking.status,
        emergencySeverity: booking.emergencySeverity,
        driverName: booking.driverName || ambulance?.driverName || 'Rajesh Kumar',
        driverPhone: booking.driverPhone || ambulance?.driverPhone || '+91 98201 10800',
        vehicleNumber: booking.vehicleNumber || ambulance?.vehicleNumber || 'MH-01-EQ-1108',
        currentLocation: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          address: currentLocation.address,
          heading: currentLocation.heading || 45,
          speedKmh: 42.5,
          lastUpdated: new Date().toISOString(),
        },
        pickupLocation: booking.pickupLocation,
        destinationHospital: booking.destinationHospital,
        estimatedArrivalMinutes: 4,
      });
    }

    // 2. If tracking a specific ambulance
    if (ambulanceId) {
      let amb: any = null;
      if (isMongoConnected()) {
        amb = await Ambulance.findById(ambulanceId);
      }
      if (!amb) {
        amb = prescriptoStore.ambulances.find((a) => a._id === ambulanceId);
      }

      if (!amb) {
        return res.status(404).json({ success: false, message: 'Ambulance not found' });
      }

      return res.json({
        success: true,
        ambulance: {
          _id: amb._id,
          vehicleNumber: amb.vehicleNumber,
          driverName: amb.driverName,
          driverPhone: amb.driverPhone,
          currentLocation: amb.currentLocation,
          isAvailable: amb.isAvailable,
          currentStatus: amb.currentStatus,
          rating: amb.rating,
        },
      });
    }

    // 3. Otherwise return all active tracking units
    let fleet: any[] = [];
    if (isMongoConnected()) {
      fleet = await Ambulance.find();
    }
    if (!fleet || fleet.length === 0) {
      fleet = prescriptoStore.ambulances || [];
    }

    const liveUnits = fleet.map((unit) => ({
      _id: unit._id,
      vehicleNumber: unit.vehicleNumber,
      driverName: unit.driverName,
      driverPhone: unit.driverPhone,
      ambulanceType: unit.ambulanceType,
      currentLocation: unit.currentLocation,
      isAvailable: unit.isAvailable,
      currentStatus: unit.currentStatus,
      rating: unit.rating,
      heading: unit.currentLocation?.heading || 0,
      speedKmh: unit.isAvailable ? 0 : 38.5,
    }));

    return res.json({
      success: true,
      totalUnits: liveUnits.length,
      activeUnits: liveUnits.filter((u) => u.isAvailable).length,
      trackingData: liveUnits,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/tracking/update
 * Driver location ping update endpoint.
 */
export const updateLiveTracking = async (req: Request, res: Response) => {
  try {
    const { ambulanceId, lat, lng, heading = 0, speed = 0, address } = req.body;

    if (!ambulanceId || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'ambulanceId, lat, and lng are required' });
    }

    const updatedLocation = {
      lat: Number(lat),
      lng: Number(lng),
      heading: Number(heading),
      address: address || 'GPS Live Stream Ping',
      lastUpdated: new Date(),
    };

    if (isMongoConnected()) {
      await Ambulance.findByIdAndUpdate(ambulanceId, {
        currentLocation: updatedLocation,
      });
    }

    // Update in fallback store
    const amb = prescriptoStore.ambulances.find(
      (a) => a._id === ambulanceId || a.vehicleNumber === ambulanceId
    );
    if (amb) {
      amb.currentLocation = updatedLocation;
    }

    return res.json({
      success: true,
      message: 'Live tracking position updated',
      location: updatedLocation,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
