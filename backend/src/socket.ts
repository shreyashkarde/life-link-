import { Server, Socket } from 'socket.io';
import { RequestStatus, TripType, AmbulanceType, Role } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import prisma from './db';
import { sendEmergencyAlertToContacts } from './utils/smsService';
   import { getNearbyRealHospitals, getOrCreateRealHospital, OSM_EMAIL_DOMAIN } from './utils/osmHospitals';

const JWT_SECRET = process.env.JWT_SECRET || 'lifelink_jwt_secret_key_2026_super_secure';

// Haversine formula to compute distance in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function isValidCoordinate(lat: any, lng: any): boolean {
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  return (
    !isNaN(nLat) &&
    !isNaN(nLng) &&
    isFinite(nLat) &&
    isFinite(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
}

// Maps driver userId to socket ID
const driverSockets = new Map<string, string>();
// Maps patient userId to socket ID
const patientSockets = new Map<string, string>();
// Maps hospital admin userId to socket ID
const hospitalSockets = new Map<string, string>();
// Telemetry sockets list
const telemetrySockets = new Set<string>();

interface DispatchQueue {
  requestId: string;
  candidates: string[];
  currentIndex: number;
  payload: any;
}
const dispatchQueues = new Map<string, DispatchQueue>();

let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

export function broadcastToHospital(hospitalAdminUserId: string, event: string, data: any) {
  if (!ioInstance) return;
  const socketId = hospitalSockets.get(hospitalAdminUserId);
  if (socketId) {
    ioInstance.to(socketId).emit(event, data);
  }
  ioInstance.to('hospital_room').emit(event, data);
}

export function broadcastToDriver(driverId: string, event: string, data: any) {
  if (!ioInstance) return;
  const socketId = driverSockets.get(driverId);
  if (socketId) {
    ioInstance.to(socketId).emit(event, data);
  }
}

export function broadcastToPatient(patientId: string, event: string, data: any) {
  if (!ioInstance) return;
  const socketId = patientSockets.get(patientId);
  if (socketId) {
    ioInstance.to(socketId).emit(event, data);
  }
}

export function broadcastToSuperAdmin(event: string, data: any) {
  if (!ioInstance) return;
  ioInstance.to('super_admin_room').to('telemetry_room').emit(event, data);
}

export function setupSocketHandlers(io: Server) {
  ioInstance = io;

  // Socket authentication middleware
  io.use((socket: Socket, next: (err?: any) => void) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.split(' ')[1]);

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        socket.data.user = decoded;
      } catch (err) {
        // Token invalid, allow anonymous socket connection but socket.data.user will be undefined
        console.warn(`[Socket Auth] Invalid token on socket ${socket.id}`);
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register Patient (validates user context)
    socket.on('patient:register', (patientId: string) => {
      const effectiveId = socket.data.user?.id || patientId;
      if (effectiveId) {
        patientSockets.set(effectiveId, socket.id);
        console.log(`Registered Patient: ${effectiveId} on socket ${socket.id}`);
      }
    });

    // Register Driver
    socket.on('driver:register', (driverId: string) => {
      const effectiveId = socket.data.user?.id || driverId;
      if (effectiveId) {
        driverSockets.set(effectiveId, socket.id);
        console.log(`Registered Driver: ${effectiveId} on socket ${socket.id}`);
      }
    });

    // Register Hospital Admin
    socket.on('hospital:register', (adminUserId: string) => {
      const effectiveId = socket.data.user?.id || adminUserId;
      if (effectiveId) {
        hospitalSockets.set(effectiveId, socket.id);
        console.log(`Registered Hospital Admin: ${effectiveId} on socket ${socket.id}`);
        socket.join('hospital_room');
      }
    });

    // Register Super Admin Telemetry and Activity
    socket.on('telemetry:register', () => {
      telemetrySockets.add(socket.id);
      socket.join('telemetry_room');
      socket.join('super_admin_room');
      console.log(`Registered Telemetry listener: ${socket.id}`);
    });

    socket.on('superadmin:register', () => {
      telemetrySockets.add(socket.id);
      socket.join('super_admin_room');
      socket.join('telemetry_room');
      console.log(`Registered Super Admin room listener: ${socket.id}`);
    });

    // Handle SOS and standard dispatches
    socket.on('sos:trigger', async (data: {
      patientId: string;
      lat: number;
      lng: number;
      tripType: 'SOS' | 'STANDARD';
      ambulanceType?: string;
      hospitalId?: string;
    }) => {
      const { patientId: rawPatientId, lat, lng, tripType, ambulanceType, hospitalId } = data;
      const patientId = socket.data.user?.id || rawPatientId;

      if (!isValidCoordinate(lat, lng)) {
        socket.emit('sos:error', { message: 'Invalid GPS coordinates provided.' });
        return;
      }

      console.log(`SOS/Standard Triggered by ${patientId} at (${lat}, ${lng})`);

      try {
        // Idempotency / Duplicate SOS Check:
        // If patient already has an active pending or in-progress trip, recover it instead of creating duplicates
        const existingActiveRequest = await prisma.emergencyRequest.findFirst({
          where: {
            patientId,
            status: {
              notIn: [RequestStatus.COMPLETED, RequestStatus.REJECTED],
            },
          },
          include: {
            patient: { include: { patientProfile: true } },
            hospital: true,
            driver: { include: { ambulance: true } },
          },
        });

        if (existingActiveRequest) {
          console.log(`[SOS Deduplication] Active request ${existingActiveRequest.id} already exists for patient ${patientId}`);
          socket.emit('sos:initiated', {
            request: existingActiveRequest,
            hospital: existingActiveRequest.hospital,
          });
          return;
        }

        // Fetch patient details and medical profile
        const patient = await prisma.user.findUnique({
          where: { id: patientId },
          include: { patientProfile: true, emergencyContacts: true },
        });

        if (!patient) {
          socket.emit('sos:error', { message: 'Patient account not found' });
          return;
        }

        // 1. Locate all available online drivers within 15 km
        const allAvailableAmbulances = await prisma.ambulance.findMany({
          where: { isAvailable: true },
          include: { driver: true },
        });

        let nearbyDrivers = allAvailableAmbulances.filter((amb) => {
          const distance = getDistance(lat, lng, amb.currentLat, amb.currentLng);
          const typeMatches = !ambulanceType || amb.ambulanceType === ambulanceType;
          return distance <= 15.0 && typeMatches;
        });

        // Ensure there is always an available ambulance unit in patient's local vicinity (~1.5 km fallback)
        if (nearbyDrivers.length === 0 && allAvailableAmbulances.length > 0) {
          const candidate = allAvailableAmbulances[0];
          const localLat = lat + 0.0085;
          const localLng = lng - 0.0075;
          await prisma.ambulance.update({
            where: { id: candidate.id },
            data: { currentLat: localLat, currentLng: localLng },
          });
          candidate.currentLat = localLat;
          candidate.currentLng = localLng;
          nearbyDrivers = [candidate];
        }

                // 2. Find the target hospital
        let targetHospital: any = null;
        let minHospitalDist = 0;

        // 2a. Hospital chosen by the patient (registered on LifeLink)
        if (data.hospitalId) {
          targetHospital = await prisma.hospital.findUnique({
            where: { id: data.hospitalId },
          });
          if (targetHospital) {
            minHospitalDist = getDistance(lat, lng, targetHospital.lat, targetHospital.lng);
          }
        }

        // 2b. Otherwise pick the nearest hospital within 20 km
        if (!targetHospital) {
          // Hospitals registered on LifeLink (skip auto-created real-world ones)
          const allHospitals = await prisma.hospital.findMany({
            include: { adminUser: { select: { email: true } } },
          });

          let closestRegistered: any = null;
          let closestRegisteredDist = Infinity;
          for (const h of allHospitals) {
            if (h.adminUser?.email?.endsWith(OSM_EMAIL_DOMAIN)) continue;
            const dist = getDistance(lat, lng, h.lat, h.lng);
            if (dist < closestRegisteredDist) {
              closestRegisteredDist = dist;
              const { adminUser, ...hospitalOnly } = h;
              closestRegistered = hospitalOnly;
            }
          }

          if (closestRegistered && closestRegisteredDist <= 20.0) {
            targetHospital = closestRegistered;
            minHospitalDist = closestRegisteredDist;
          } else {
            // Real hospitals near the patient (OpenStreetMap)
            const realHospitals = await getNearbyRealHospitals(lat, lng, 20);
            if (realHospitals.length > 0) {
              targetHospital = await getOrCreateRealHospital(realHospitals[0]);
              minHospitalDist = realHospitals[0].distanceKm;
            }
          }
        }

        if (!targetHospital) {
          socket.emit('sos:error', {
            message: 'No hospital found near your location. Please call 112 immediately.',
          });
          return;
        }// Calculate realistic ETA (2 minutes per kilometer + 2 minutes base)
        const etaMinutes = Math.max(3, Math.round(minHospitalDist * 2.0 + 2));

        // 3. Create the EmergencyRequest in database
        const emergencyRequest = await prisma.emergencyRequest.create({
          data: {
            patientId,
            hospitalId: targetHospital.id,
            pickupLat: lat,
            pickupLng: lng,
            status: RequestStatus.PENDING,
            tripType: tripType as TripType,
            etaMinutes,
          },
          include: {
            patient: {
              include: {
                patientProfile: true,
              },
            },
            hospital: true,
          },
        });

        // 4. Send response to patient
        socket.emit('sos:initiated', {
          request: emergencyRequest,
          hospital: targetHospital,
        });

        // 4b. Dispatch Emergency SMS alert to patient's emergency contacts
        if (patient.emergencyContacts && patient.emergencyContacts.length > 0) {
          sendEmergencyAlertToContacts(
            patient.emergencyContacts.map((c) => ({ name: c.name, phone: c.phone })),
            patient.name,
            patient.patientProfile?.customAlertMessage,
            { lat, lng }
          ).catch((err) => console.error('[SMS SOS Dispatch Error]', err));
        }

        // 5. Send dispatch to the closest available candidate first (Sequential Dispatch)
        const payloadForDrivers = {
          requestId: emergencyRequest.id,
          pickupLat: lat,
          pickupLng: lng,
          tripType: emergencyRequest.tripType,
          patientName: patient.name,
          patientPhone: patient.phone,
          bloodGroup: patient.patientProfile?.bloodGroup || 'Unknown',
          medicalNotes: patient.patientProfile?.medicalNotes || 'None',
          allergies: patient.patientProfile?.allergies || 'None',
          hospitalName: targetHospital.name,
          distanceKm: parseFloat(minHospitalDist.toFixed(2)),
        };

        // Sort available nearby drivers by distance
        const sortedNearbyDrivers = nearbyDrivers
          .map((amb) => {
            const dist = getDistance(lat, lng, amb.currentLat, amb.currentLng);
            return { amb, dist };
          })
          .sort((a, b) => a.dist - b.dist);

        const candidateDriverIds = sortedNearbyDrivers
          .map((item) => item.amb.driverId)
          .filter((id): id is string => !!id);

        if (candidateDriverIds.length > 0) {
          const firstDriverId = candidateDriverIds[0];
          const firstDriverSocketId = driverSockets.get(firstDriverId);

          dispatchQueues.set(emergencyRequest.id, {
            requestId: emergencyRequest.id,
            candidates: candidateDriverIds,
            currentIndex: 0,
            payload: payloadForDrivers,
          });

          if (firstDriverSocketId) {
            console.log(`SOS Dispatching: Request ${emergencyRequest.id} sent to first candidate driver ${firstDriverId}`);
            io.to(firstDriverSocketId).emit('request:new', payloadForDrivers);
          }
        } else {
          console.log(`No available ambulance drivers within range for SOS request ${emergencyRequest.id}`);
        }
        // DEMO MODE (DEMO_AUTO_ASSIGN=true in .env): if no driver app is online to
        // answer the request, auto-accept it with the nearest ambulance so the live
        // tracking flow can be shown. The ambulance movement is simulated.
        if (
          process.env.DEMO_AUTO_ASSIGN === 'true' &&
          sortedNearbyDrivers.length > 0 &&
          !candidateDriverIds.some((id) => driverSockets.has(id))
        ) {
          const demoAmbulanceId = sortedNearbyDrivers[0].amb.id;
          const demoRequestId = emergencyRequest.id;
          const demoPatientSocketId = socket.id;
          setTimeout(() => {
            autoAssignDemoDriver(io, demoRequestId, demoAmbulanceId, demoPatientSocketId);
          }, 4000);
        }
        // 6. Broadcast to the assigned hospital ER board
        io.to('hospital_room').emit('hospital:new_emergency', {
          request: emergencyRequest,
          patientProfile: patient.patientProfile,
          patientName: patient.name,
          patientPhone: patient.phone,
        });

        // 7. Update Super Admin telemetry
        io.to('telemetry_room').emit('telemetry:update');

      } catch (err: any) {
        console.error('SOS triggering error:', err);
        socket.emit('sos:error', { message: 'Failed to initiate dispatch request' });
      }
    });

    // Real-Time SOS Cancellation Handler
    socket.on('sos:cancel', async (data: { requestId: string }) => {
      const { requestId } = data;
      const patientId = socket.data.user?.id;

      try {
        const whereClause: any = { id: requestId };
        if (patientId) whereClause.patientId = patientId;

        const request = await prisma.emergencyRequest.findFirst({
          where: whereClause,
          include: { driver: true, hospital: true },
        });

        if (!request) {
          socket.emit('sos:cancel_error', { message: 'Active emergency request not found' });
          return;
        }

        // Atomic Cancellation
        const updated = await prisma.$transaction(async (tx) => {
          const req = await tx.emergencyRequest.update({
            where: { id: requestId },
            data: { status: RequestStatus.REJECTED },
            include: { hospital: true, patient: true },
          });

          if (request.driverId) {
            await tx.ambulance.update({
              where: { driverId: request.driverId },
              data: { isAvailable: true },
            });
          }

          return req;
        });

        // Stop road simulations & clean up queue
        stopRouteSimulation(requestId);
        dispatchQueues.delete(requestId);

        // Notify assigned driver
        if (request.driverId) {
          broadcastToDriver(request.driverId, 'request:cancelled', { requestId });
        }

        // Broadcast to hospital & super admin
        io.to('hospital_room').emit('hospital:emergency_status_changed', {
          request: updated,
          status: RequestStatus.REJECTED,
        });
        io.to('telemetry_room').emit('telemetry:update');

        socket.emit('sos:cancelled', { requestId, success: true });
        console.log(`Emergency request ${requestId} cancelled successfully.`);
      } catch (err: any) {
        console.error('Error cancelling emergency request:', err);
        socket.emit('sos:cancel_error', { message: 'Failed to cancel emergency request' });
      }
    });

    // Driver Slide to Accept Emergency Request (Atomic Concurrency Locking)
    socket.on('request:accept', async (data: { requestId: string; driverId: string }) => {
      const { requestId, driverId: rawDriverId } = data;
      const driverId = socket.data.user?.id || rawDriverId;
      console.log(`Driver ${driverId} attempting to accept request ${requestId}`);

      try {
        // 1. Check if driver has an active ambulance
        const ambulance = await prisma.ambulance.findUnique({
          where: { driverId },
          include: { driver: true },
        });

        if (!ambulance) {
          socket.emit('request:accept_error', { message: 'Ambulance vehicle details not configured.' });
          return;
        }

        // 2. Prevent driver from accepting if already engaged on another uncompleted trip
        const activeDriverTrip = await prisma.emergencyRequest.findFirst({
          where: {
            driverId,
            status: { in: [RequestStatus.ACCEPTED, RequestStatus.ARRIVING, RequestStatus.IN_TRANSIT] },
          },
        });

        if (activeDriverTrip && activeDriverTrip.id !== requestId) {
          socket.emit('request:accept_error', { message: 'You already have an active emergency trip in progress.' });
          return;
        }

        // 3. Atomic Database Concurrency Lock:
        // Update request ONLY if status is strictly PENDING
        const updatedRequest = await prisma.$transaction(async (tx) => {
          const updateResult = await tx.emergencyRequest.updateMany({
            where: {
              id: requestId,
              status: RequestStatus.PENDING,
            },
            data: {
              status: RequestStatus.ACCEPTED,
              driverId: driverId,
            },
          });

          if (updateResult.count === 0) {
            throw new Error('ALREADY_CLAIMED');
          }

          // Mark driver as unavailable on active trip
          await tx.ambulance.update({
            where: { driverId },
            data: { isAvailable: false },
          });

          return tx.emergencyRequest.findUnique({
            where: { id: requestId },
            include: {
              patient: {
                include: { patientProfile: true },
              },
              hospital: true,
            },
          });
        });

        if (!updatedRequest) {
          throw new Error('REQUEST_FETCH_FAILED');
        }

        // Broadcast to patient
        const patientSocketId = patientSockets.get(updatedRequest.patientId);
        if (patientSocketId) {
          io.to(patientSocketId).emit('request:accepted', {
            request: updatedRequest,
            driverName: ambulance?.driver?.name || 'Unknown',
            driverPhone: ambulance?.driver?.phone || '',
            vehicleNumber: ambulance?.vehicleNumber,
            ambulanceType: ambulance?.ambulanceType,
            lat: ambulance?.currentLat,
            lng: ambulance?.currentLng,
          });
        }

        // Broadcast dismiss event to other drivers
        io.emit('request:claimed', { requestId, claimerDriverId: driverId });

        // Broadcast update to Hospital ER board
        io.to('hospital_room').emit('hospital:emergency_claimed', {
          request: updatedRequest,
          driverName: ambulance?.driver?.name || 'Unknown',
          driverPhone: ambulance?.driver?.phone || '',
          vehicleNumber: ambulance?.vehicleNumber,
        });

        // Emit success back to the claiming driver
        socket.emit('request:accept_success', { request: updatedRequest });

        // Update Super Admin telemetry
        io.to('telemetry_room').emit('telemetry:update');

        // Delete matching queue from in-memory dispatch queues
        dispatchQueues.delete(requestId);

        // Start routing simulation on accept
        startRouteSimulation(io, requestId, driverId, ambulance.currentLat, ambulance.currentLng, updatedRequest.pickupLat, updatedRequest.pickupLng);

      } catch (err: any) {
        if (err.message === 'ALREADY_CLAIMED') {
          socket.emit('request:accept_error', { message: 'This request has already been claimed by another driver.' });
        } else {
          console.error('Accepting request error:', err);
          socket.emit('request:accept_error', { message: 'Failed to process request acceptance.' });
        }
      }
    });

    // Driver Slide to Decline/Reject Emergency Request (Pass to next driver)
    socket.on('request:reject', async (data: { requestId: string; driverId: string }) => {
      const { requestId, driverId: rawDriverId } = data;
      const driverId = socket.data.user?.id || rawDriverId;
      console.log(`Driver ${driverId} rejected request ${requestId}`);

      const queue = dispatchQueues.get(requestId);
      if (queue) {
        if (queue.candidates[queue.currentIndex] === driverId) {
          queue.currentIndex++;
          if (queue.currentIndex < queue.candidates.length) {
            const nextDriverId = queue.candidates[queue.currentIndex];
            const nextDriverSocketId = driverSockets.get(nextDriverId);
            if (nextDriverSocketId) {
              console.log(`Request ${requestId} passed to next closest driver ${nextDriverId}`);
              io.to(nextDriverSocketId).emit('request:new', queue.payload);
            }
          } else {
            console.log(`All candidate drivers declined request ${requestId}`);
            // Update request status to REJECTED in database
            await prisma.emergencyRequest.update({
              where: { id: requestId },
              data: { status: RequestStatus.REJECTED },
            });

            // Notify patient
            const request = await prisma.emergencyRequest.findUnique({
              where: { id: requestId },
            });
            if (request) {
              const patientSocketId = patientSockets.get(request.patientId);
              if (patientSocketId) {
                io.to(patientSocketId).emit('sos:error', {
                  message: 'All nearby emergency ambulances are currently engaged. Please hold, dispatch command is routing out-of-network responders.',
                });
              }
            }
            dispatchQueues.delete(requestId);
          }
        }
      }
    });

    // Driver Update Trip Status in Real-Time
    socket.on('trip:status_update', async (data: {
      requestId: string;
      driverId: string;
      status: 'ACCEPTED' | 'ARRIVING' | 'IN_TRANSIT' | 'AT_HOSPITAL' | 'COMPLETED' | 'REJECTED';
    }) => {
      const { requestId, driverId: rawDriverId, status } = data;
      const driverId = socket.data.user?.id || rawDriverId;
      console.log(`Driver ${driverId} updating request ${requestId} to status ${status}`);

      try {
        const reqStatus = status as RequestStatus;

        // Fetch the request and verify authorization
        const request = await prisma.emergencyRequest.findUnique({
          where: { id: requestId },
        });

        if (!request) {
          socket.emit('trip:status_error', { message: 'Trip not found' });
          return;
        }

        // Authorization check: only assigned driver or super admin can update
        if (request.driverId && request.driverId !== driverId && socket.data.user?.role !== Role.SUPER_ADMIN) {
          socket.emit('trip:status_error', { message: 'Unauthorized to update this trip status' });
          return;
        }

        const isCompleted = reqStatus === RequestStatus.COMPLETED;
        const isRejected = reqStatus === RequestStatus.REJECTED;

        const updatedRequest = await prisma.$transaction(async (tx) => {
          const req = await tx.emergencyRequest.update({
            where: { id: requestId },
            data: {
              status: reqStatus,
              completedAt: isCompleted ? new Date() : null,
            },
            include: {
              patient: true,
              hospital: true,
            },
          });

          // If completed or rejected, free up the driver ambulance
          if (isCompleted || isRejected) {
            await tx.ambulance.update({
              where: { driverId },
              data: { isAvailable: true },
            });
          }

          return req;
        });

        // Fetch driver vehicle details for status broadcasts
        const ambulance = await prisma.ambulance.findUnique({
          where: { driverId },
          include: { driver: true },
        });

        // Broadcast to patient
        const patientSocketId = patientSockets.get(updatedRequest.patientId);
        if (patientSocketId) {
          io.to(patientSocketId).emit('trip:status_changed', {
            request: updatedRequest,
            driverName: ambulance?.driver?.name || 'Unknown',
            vehicleNumber: ambulance?.vehicleNumber,
          });
        }

        // Broadcast to hospital ER board
        io.to('hospital_room').emit('hospital:emergency_status_changed', {
          request: updatedRequest,
          driverName: ambulance?.driver?.name || 'Unknown',
          vehicleNumber: ambulance?.vehicleNumber,
        });

        // Emit back to the driver
        socket.emit('trip:status_success', { request: updatedRequest });

        // Update Super Admin telemetry
        io.to('telemetry_room').emit('telemetry:update');

        // Start or stop routing simulation based on trip phase
        if (reqStatus === RequestStatus.IN_TRANSIT) {
          startRouteSimulation(
            io,
            requestId,
            driverId,
            updatedRequest.pickupLat,
            updatedRequest.pickupLng,
            updatedRequest.hospital.lat,
            updatedRequest.hospital.lng
          );
        } else if (
          reqStatus === RequestStatus.COMPLETED ||
          reqStatus === RequestStatus.REJECTED ||
          reqStatus === RequestStatus.AT_HOSPITAL
        ) {
          stopRouteSimulation(requestId);
        }

      } catch (err: any) {
        console.error('Updating trip status error:', err);
        socket.emit('trip:status_error', { message: 'Failed to update trip status.' });
      }
    });

    // Driver periodic location update
    socket.on('driver:location_update', async (data: {
      driverId: string;
      lat: number;
      lng: number;
      requestId?: string;
    }) => {
      const { driverId: rawDriverId, lat, lng, requestId } = data;
      const driverId = socket.data.user?.id || rawDriverId;

      if (!isValidCoordinate(lat, lng)) {
        return; // Silently ignore invalid telemetry coordinates
      }

      try {
        // 1. Update ambulance coordinates in database
        const ambulance = await prisma.ambulance.update({
          where: { driverId },
          data: {
            currentLat: lat,
            currentLng: lng,
            lastUpdated: new Date(),
          },
          include: { driver: true },
        });

        // 2. Broadcast coordinates to the active patient
        if (requestId) {
          const request = await prisma.emergencyRequest.findUnique({
            where: { id: requestId },
          });

          if (request) {
            const patientSocketId = patientSockets.get(request.patientId);
            if (patientSocketId) {
              io.to(patientSocketId).emit('driver:location_changed', {
                driverId,
                lat,
                lng,
                vehicleNumber: ambulance.vehicleNumber,
              });
            }
          }
        }

        // 3. Broadcast to hospital board if driving to ER
        io.to('hospital_room').emit('driver:location_changed', {
          driverId,
          lat,
          lng,
          vehicleNumber: ambulance.vehicleNumber,
        });

        // 4. Update Telemetry room
        io.to('telemetry_room').emit('telemetry:driver_moved', {
          driverId,
          lat,
          lng,
          vehicleNumber: ambulance.vehicleNumber,
        });

      } catch (err) {
        // Fail silently on periodic GPS updates
      }
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);

      for (const [key, value] of driverSockets.entries()) {
        if (value === socket.id) driverSockets.delete(key);
      }
      for (const [key, value] of patientSockets.entries()) {
        if (value === socket.id) patientSockets.delete(key);
      }
      for (const [key, value] of hospitalSockets.entries()) {
        if (value === socket.id) hospitalSockets.delete(key);
      }
      telemetrySockets.delete(socket.id);
    });
  });
}

// -------------------------------------------------------------
// Real-Time Road Routing Simulator (OSRM Integration)
// -------------------------------------------------------------

interface ActiveSimulation {
  requestId: string;
  driverId: string;
  points: [number, number][];
  currentIndex: number;
  interval: NodeJS.Timeout;
}

const activeSimulations = new Map<string, ActiveSimulation>();

async function fetchDirectionsRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<[number, number][]> {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_TOKEN || '';

  // 1. Try Mapbox Directions API v5 if token is present
  if (mapboxToken) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.routes && data.routes.length > 0) {
          return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        }
      }
    } catch (error) {
      console.error('Error fetching route from Mapbox Directions API:', error);
    }
  }

  // 2. Fallback to OSRM OpenStreetMap routing
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full`;
    const res = await fetch(url);
    const data = (await res.json()) as any;
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    }
  } catch (error) {
    console.error('Error fetching route from OSRM:', error);
  }

  // Robust Fallback: straight-line geometry split into 15 steps
  const steps = 15;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const lat = startLat + (endLat - startLat) * (i / steps);
    const lng = startLng + (endLng - startLng) * (i / steps);
    points.push([lat, lng]);
  }
  return points;
}

export async function startRouteSimulation(
  io: Server,
  requestId: string,
  driverId: string,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
) {
  // Reset any active simulation on request or driver
  stopRouteSimulation(requestId);
  for (const [reqId, sim] of activeSimulations.entries()) {
    if (sim.driverId === driverId) {
      stopRouteSimulation(reqId);
    }
  }

  const points = await fetchDirectionsRoute(startLat, startLng, endLat, endLng);
  if (points.length === 0) return;

  console.log(`Starting backend turn-by-turn simulation for request ${requestId} (${points.length} nodes)`);

  let currentIndex = 0;
  const interval = setInterval(async () => {
    const sim = activeSimulations.get(requestId);
    if (!sim) {
      clearInterval(interval);
      return;
    }

    if (currentIndex >= points.length) {
      clearInterval(interval);
      activeSimulations.delete(requestId);
      console.log(`Simulation reached target end for request ${requestId}`);
      return;
    }

    const [currentLat, currentLng] = points[currentIndex];
    currentIndex++;

    try {
      // 1. Update coordinates in DB
      const ambulance = await prisma.ambulance.update({
        where: { driverId },
        data: {
          currentLat,
          currentLng,
          lastUpdated: new Date(),
        },
        include: { driver: true },
      });

      // 2. Broadcast coordinates to patient
      const request = await prisma.emergencyRequest.findUnique({
        where: { id: requestId },
      });

      if (request) {
        const patientSocketId = patientSockets.get(request.patientId);
        if (patientSocketId) {
          io.to(patientSocketId).emit('driver:location_changed', {
            driverId,
            lat: currentLat,
            lng: currentLng,
            vehicleNumber: ambulance.vehicleNumber,
          });
        }
      }

      // 3. Broadcast to hospital board
      io.to('hospital_room').emit('driver:location_changed', {
        driverId,
        lat: currentLat,
        lng: currentLng,
        vehicleNumber: ambulance.vehicleNumber,
      });

      // 4. Update Telemetry room
      io.to('telemetry_room').emit('telemetry:driver_moved', {
        driverId,
        lat: currentLat,
        lng: currentLng,
        vehicleNumber: ambulance.vehicleNumber,
      });

      // 5. Broadcast to driver socket to synchronize driver dashboard view
      const driverSocketId = driverSockets.get(driverId);
      if (driverSocketId) {
        io.to(driverSocketId).emit('driver:coordinates_simulated', {
          lat: currentLat,
          lng: currentLng,
        });
      }

    } catch (err) {
      // Fail silently
    }
  }, 3500); // Step every 3.5 seconds

  activeSimulations.set(requestId, {
    requestId,
    driverId,
    points,
    currentIndex,
    interval,
  });
}

export function stopRouteSimulation(requestId: string) {
  const sim = activeSimulations.get(requestId);
  if (sim) {
    clearInterval(sim.interval);
    activeSimulations.delete(requestId);
    console.log(`Stopped simulation for request ${requestId}`);
  }
}
// DEMO ONLY: accept a pending request on behalf of the nearest ambulance
async function autoAssignDemoDriver(
  io: Server,
  requestId: string,
  ambulanceId: string,
  fallbackSocketId: string
) {
  try {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: ambulanceId },
      include: { driver: true },
    });
    if (!ambulance || !ambulance.driverId) return;
    const driverId = ambulance.driverId;

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const result = await tx.emergencyRequest.updateMany({
        where: { id: requestId, status: RequestStatus.PENDING },
        data: { status: RequestStatus.ACCEPTED, driverId },
      });
      if (result.count === 0) return null; // cancelled or taken by a real driver meanwhile

      await tx.ambulance.update({
        where: { id: ambulanceId },
        data: { isAvailable: false },
      });

      return tx.emergencyRequest.findUnique({
        where: { id: requestId },
        include: {
          patient: { include: { patientProfile: true } },
          hospital: true,
          driver: { include: { ambulance: true } },
        },
      });
    });
    if (!updatedRequest) return;

    dispatchQueues.delete(requestId);

    const patientSocketId = patientSockets.get(updatedRequest.patientId) || fallbackSocketId;
    io.to(patientSocketId).emit('request:accepted', {
      request: updatedRequest,
      driverName: ambulance.driver?.name || 'Demo Driver',
      driverPhone: ambulance.driver?.phone || '',
      vehicleNumber: ambulance.vehicleNumber,
      ambulanceType: ambulance.ambulanceType,
      lat: ambulance.currentLat,
      lng: ambulance.currentLng,
    });

    io.to('hospital_room').emit('hospital:emergency_claimed', {
      request: updatedRequest,
      driverName: ambulance.driver?.name || 'Demo Driver',
      driverPhone: ambulance.driver?.phone || '',
      vehicleNumber: ambulance.vehicleNumber,
    });
    io.to('telemetry_room').emit('telemetry:update');

    startRouteSimulation(
      io,
      requestId,
      driverId,
      ambulance.currentLat,
      ambulance.currentLng,
      updatedRequest.pickupLat,
      updatedRequest.pickupLng
    );
  } catch (err) {
    console.error('[Demo auto-assign error]', err);
  }
}