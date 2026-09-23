/**
 * 🧠 AI Intelligent Dispatch Service
 * "AI-based scoring system is used to predict optimal driver and hospital based on real-time and contextual data."
 */

export interface GeoPoint {
  lat: number;
  lng: number;
  address?: string;
}

export interface DriverCandidate {
  _id: string;
  driverName: string;
  driverPhone: string;
  driverId?: string;
  vehicleNumber: string;
  ambulanceType?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address?: string;
    heading?: number;
  };
  isAvailable?: boolean;
  currentStatus?: string;
  assignedHospital?: string;
  hospitalId?: string;
  hospitalName?: string;
  rating?: number;
  reviewCount?: number;
  equipmentList?: string[];
}

export interface HospitalCandidate {
  _id: string;
  id?: string;
  name: string;
  address: any;
  city?: string;
  traumaLevel?: string;
  totalBeds?: number;
  icuBedsAvailable?: number;
  isActive?: boolean;
  doctorsCount?: number;
  driversCount?: number;
  specialities?: string[];
}

export interface DriverScoreResult {
  driver: DriverCandidate;
  score: number; // Lower score = better candidate
  distanceKm: number;
  etaMinutes: number;
  confidencePercent: number;
  breakdown: {
    distanceScore: number;
    ratingScore: number;
    availabilityScore: number;
    etaScore: number;
    equipmentBonus: number;
  };
  reasons: string[];
}

export interface HospitalScoreResult {
  hospital: HospitalCandidate;
  score: number; // Lower score = better candidate
  distanceKm: number;
  etaMinutes: number;
  icuBedsAvailable: number;
  confidencePercent: number;
  breakdown: {
    distanceScore: number;
    capacityScore: number;
    specializationScore: number;
    emergencyTierScore: number;
  };
  reasons: string[];
}

// =========================================================================
// 1. Haversine Distance Calculation Function
// =========================================================================
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) {
    return 2.5; // Default safe distance in km
  }
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// =========================================================================
// 2. AI Driver Scoring Logic
// =========================================================================
export const getDriverScore = (
  driver: DriverCandidate,
  patientLocation: GeoPoint,
  patientCondition: string = 'Emergency'
): DriverScoreResult => {
  const dLat = driver.currentLocation?.lat ?? 19.0760;
  const dLng = driver.currentLocation?.lng ?? 72.8777;
  const pLat = patientLocation?.lat ?? 19.0760;
  const pLng = patientLocation?.lng ?? 72.8777;

  // 1. Distance Calculation (40% Weight)
  const distanceKm = calculateDistance(dLat, dLng, pLat, pLng);
  const normalizedDistance = Math.min(distanceKm / 15, 1.0) * 100;
  const distanceWeight = 0.40;
  const distanceScore = normalizedDistance * distanceWeight;

  // 2. Driver Rating (15% Weight, Inverted: higher rating -> lower penalty)
  const rating = driver.rating ?? 4.8;
  const normalizedRatingPenalty = Math.max(0, (5.0 - rating) / 5.0) * 100;
  const ratingWeight = 0.15;
  const ratingScore = normalizedRatingPenalty * ratingWeight;

  // 3. Driver Availability & Duty Status (25% Weight)
  let availabilityPenalty = 0;
  if (driver.isAvailable === false) {
    availabilityPenalty = 100; // Offline
  } else if (driver.currentStatus === 'IDLE' || !driver.currentStatus) {
    availabilityPenalty = 0; // Ready for immediate dispatch
  } else if (driver.currentStatus === 'COMPLETED') {
    availabilityPenalty = 10; // Finishing previous handover
  } else if (driver.currentStatus === 'ASSIGNED' || driver.currentStatus === 'EN_ROUTE_PICKUP') {
    availabilityPenalty = 75; // Currently en route
  } else {
    availabilityPenalty = 95; // Patient onboard
  }
  const availabilityWeight = 0.25;
  const availabilityScore = availabilityPenalty * availabilityWeight;

  // 4. Estimated Time of Arrival (20% Weight)
  const etaMinutes = Math.max(2, Math.round(distanceKm * 2.3 + 1.5));
  const normalizedEta = Math.min(etaMinutes / 40, 1.0) * 100;
  const etaWeight = 0.20;
  const etaScore = normalizedEta * etaWeight;

  // 5. Equipment & Vehicle Type Bonus (Reduces Score)
  let equipmentBonus = 0;
  const isCritical =
    patientCondition.toLowerCase().includes('cardiac') ||
    patientCondition.toLowerCase().includes('chest') ||
    patientCondition.toLowerCase().includes('stroke') ||
    patientCondition.toLowerCase().includes('respiratory') ||
    patientCondition.toLowerCase().includes('code red') ||
    patientCondition.toLowerCase().includes('unconscious');

  if (isCritical && (driver.ambulanceType === 'ICU' || driver.ambulanceType === 'ADVANCED')) {
    equipmentBonus = 12; // Bonus for Advanced Life Support equipment
  }

  // Composite AI Score (Lower is better)
  const rawScore = distanceScore + ratingScore + availabilityScore + etaScore - equipmentBonus;
  const finalScore = Math.max(1, Math.round(rawScore * 10) / 10);

  // Confidence Score (0-100%)
  const confidencePercent = Math.max(65, Math.min(99, Math.round(100 - finalScore * 0.75)));

  const reasons: string[] = [];
  if (distanceKm <= 2.5) reasons.push(`Proximity: Fast response distance (${distanceKm} km away)`);
  if (rating >= 4.8) reasons.push(`High Service Rating (${rating} ★)`);
  if (driver.currentStatus === 'IDLE' || driver.isAvailable !== false) reasons.push('Immediate dispatch ready (Active on-duty)');
  if (equipmentBonus > 0) reasons.push(`ALS Equipment Match: ${driver.ambulanceType} unit configured for ${patientCondition}`);

  return {
    driver,
    score: finalScore,
    distanceKm,
    etaMinutes,
    confidencePercent,
    breakdown: {
      distanceScore: Math.round(distanceScore * 10) / 10,
      ratingScore: Math.round(ratingScore * 10) / 10,
      availabilityScore: Math.round(availabilityScore * 10) / 10,
      etaScore: Math.round(etaScore * 10) / 10,
      equipmentBonus,
    },
    reasons,
  };
};

// =========================================================================
// 3. AI Hospital Scoring Logic
// =========================================================================
export const getHospitalScore = (
  hospital: HospitalCandidate,
  patientCondition: string = 'General Care',
  patientLocation: GeoPoint = { lat: 19.0760, lng: 72.8777 }
): HospitalScoreResult => {
  // Extract coordinates from hospital address
  let hLat = 19.0544;
  let hLng = 72.8277;

  if (hospital.address && typeof hospital.address === 'object') {
    if (hospital.address.coordinates) {
      hLat = hospital.address.coordinates.lat || hLat;
      hLng = hospital.address.coordinates.lng || hLng;
    }
  } else if (hospital.name?.includes('Kokilaben')) {
    hLat = 19.1300;
    hLng = 72.8300;
  } else if (hospital.name?.includes('City Care')) {
    hLat = 19.0800;
    hLng = 72.8600;
  }

  const pLat = patientLocation?.lat ?? 19.0760;
  const pLng = patientLocation?.lng ?? 72.8777;

  // 1. Distance Calculation (35% Weight)
  const distanceKm = calculateDistance(hLat, hLng, pLat, pLng);
  const normalizedDistance = Math.min(distanceKm / 25, 1.0) * 100;
  const distanceWeight = 0.35;
  const distanceScore = normalizedDistance * distanceWeight;

  // 2. Capacity & Available ICU Beds (25% Weight)
  const icuBeds = hospital.icuBedsAvailable ?? 12;
  const totalBeds = hospital.totalBeds ?? 250;
  let capacityPenalty = 0;
  if (icuBeds <= 0) {
    capacityPenalty = 100; // Zero ICU beds available
  } else if (icuBeds < 3) {
    capacityPenalty = 60; // Critical capacity
  } else if (icuBeds < 8) {
    capacityPenalty = 25; // Moderate capacity
  } else {
    capacityPenalty = 5; // Abundant capacity
  }
  const capacityWeight = 0.25;
  const capacityScore = capacityPenalty * capacityWeight;

  // 3. Specialization & Clinical Capability Match (25% Weight)
  const cond = patientCondition.toLowerCase();
  let specializationPenalty = 20;

  const isLevel1 =
    hospital.traumaLevel?.toLowerCase().includes('level 1') ||
    hospital.name.includes('Lilavati') ||
    hospital.name.includes('Kokilaben');

  if (
    cond.includes('cardiac') ||
    cond.includes('heart') ||
    cond.includes('stroke') ||
    cond.includes('trauma') ||
    cond.includes('burn') ||
    cond.includes('code red')
  ) {
    if (isLevel1) {
      specializationPenalty = 0; // Apex Level 1 Trauma Center match
    } else {
      specializationPenalty = 55; // Secondary hospital penalty for critical emergencies
    }
  } else if (cond.includes('pediatric') || cond.includes('child')) {
    specializationPenalty = hospital.name.includes('Lilavati') ? 0 : 20;
  } else {
    specializationPenalty = 10;
  }
  const specializationWeight = 0.25;
  const specializationScore = specializationPenalty * specializationWeight;

  // 4. Emergency Tier & Doctors Load (15% Weight)
  let tierPenalty = 15;
  if (isLevel1) tierPenalty = 0;
  else if (hospital.traumaLevel?.includes('Level 2')) tierPenalty = 25;
  else tierPenalty = 50;

  const tierWeight = 0.15;
  const emergencyTierScore = tierPenalty * tierWeight;

  // Composite AI Hospital Score (Lower is better)
  const rawScore = distanceScore + capacityScore + specializationScore + emergencyTierScore;
  const finalScore = Math.max(1, Math.round(rawScore * 10) / 10);
  const etaMinutes = Math.max(4, Math.round(distanceKm * 2.2 + 2));

  // Confidence Percent
  const confidencePercent = Math.max(70, Math.min(99, Math.round(100 - finalScore * 0.70)));

  const reasons: string[] = [];
  if (isLevel1) reasons.push(`${hospital.traumaLevel || 'Level 1 Apex Trauma Center'} capability`);
  if (icuBeds >= 8) reasons.push(`High ICU availability (${icuBeds} ICU beds ready)`);
  if (distanceKm <= 5) reasons.push(`Short transit distance (${distanceKm} km, ~${etaMinutes} mins)`);
  if (specializationPenalty === 0) reasons.push(`Specialized emergency unit match for "${patientCondition}"`);

  return {
    hospital,
    score: finalScore,
    distanceKm,
    etaMinutes,
    icuBedsAvailable: icuBeds,
    confidencePercent,
    breakdown: {
      distanceScore: Math.round(distanceScore * 10) / 10,
      capacityScore: Math.round(capacityScore * 10) / 10,
      specializationScore: Math.round(specializationScore * 10) / 10,
      emergencyTierScore: Math.round(emergencyTierScore * 10) / 10,
    },
    reasons,
  };
};

// =========================================================================
// 4. Driver Selection Function (getBestDriver)
// =========================================================================
export const getBestDriver = (
  drivers: DriverCandidate[],
  patientLocation: GeoPoint,
  patientCondition: string = 'Emergency',
  targetHospitalId?: string
): DriverScoreResult | null => {
  if (!drivers || drivers.length === 0) {
    return null;
  }

  // 🛡️ Filter by hospitalId if target hospital is specified (Hospital Isolation)
  let candidatePool = drivers;
  if (targetHospitalId) {
    const hospitalScoped = drivers.filter((d) => d.hospitalId === targetHospitalId);
    if (hospitalScoped.length > 0) {
      candidatePool = hospitalScoped;
    }
  }

  // Score every candidate
  const scoredDrivers = candidatePool.map((driver) =>
    getDriverScore(driver, patientLocation, patientCondition)
  );

  // Sort ascending: lowest score = optimal driver
  scoredDrivers.sort((a, b) => a.score - b.score);

  return scoredDrivers[0] || null;
};

// =========================================================================
// 5. Hospital Selection Function (getBestHospital)
// =========================================================================
export const getBestHospital = (
  hospitals: HospitalCandidate[],
  patientCondition: string = 'General Emergency',
  patientLocation: GeoPoint = { lat: 19.0760, lng: 72.8777 }
): HospitalScoreResult | null => {
  if (!hospitals || hospitals.length === 0) {
    return null;
  }

  const activeHospitals = hospitals.filter((h) => h.isActive !== false);
  const pool = activeHospitals.length > 0 ? activeHospitals : hospitals;

  // Score every candidate hospital
  const scoredHospitals = pool.map((hospital) =>
    getHospitalScore(hospital, patientCondition, patientLocation)
  );

  // Sort ascending: lowest score = optimal hospital
  scoredHospitals.sort((a, b) => a.score - b.score);

  return scoredHospitals[0] || null;
};

/**
 * 🔮 Multi-Candidate Recommendation Generator
 * Returns ranked driver and hospital recommendations with full transparency
 */
export const getDispatchRecommendations = (
  drivers: DriverCandidate[],
  hospitals: HospitalCandidate[],
  patientLocation: GeoPoint,
  patientCondition: string = 'Emergency',
  targetHospitalId?: string
) => {
  const bestHospital = getBestHospital(hospitals, patientCondition, patientLocation);
  const resolvedHospitalId = targetHospitalId || bestHospital?.hospital._id;
  const bestDriver = getBestDriver(drivers, patientLocation, patientCondition, resolvedHospitalId);

  // Rank top 3 hospitals
  const rankedHospitals = hospitals
    .map((h) => getHospitalScore(h, patientCondition, patientLocation))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  // Rank top 3 drivers
  const rankedDrivers = drivers
    .filter((d) => !resolvedHospitalId || d.hospitalId === resolvedHospitalId)
    .map((d) => getDriverScore(d, patientLocation, patientCondition))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return {
    statement:
      'AI-based scoring system is used to predict optimal driver and hospital based on real-time and contextual data.',
    optimalDispatch: {
      assignedDriver: bestDriver?.driver || null,
      driverScore: bestDriver?.score || 0,
      driverEtaMinutes: bestDriver?.etaMinutes || 3,
      driverDistanceKm: bestDriver?.distanceKm || 1.5,
      driverMatchReasons: bestDriver?.reasons || [],
      recommendedHospital: bestHospital?.hospital || null,
      hospitalScore: bestHospital?.score || 0,
      hospitalEtaMinutes: bestHospital?.etaMinutes || 6,
      hospitalDistanceKm: bestHospital?.distanceKm || 3.2,
      hospitalMatchReasons: bestHospital?.reasons || [],
    },
    rankedDrivers,
    rankedHospitals,
  };
};

export default {
  calculateDistance,
  getDriverScore,
  getHospitalScore,
  getBestDriver,
  getBestHospital,
  getDispatchRecommendations,
};
