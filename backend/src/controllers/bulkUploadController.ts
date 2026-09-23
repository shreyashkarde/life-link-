import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { Doctor } from '../models/Doctor';
import { Ambulance } from '../models/Ambulance';
import { Hospital } from '../models/Hospital';
import { prescriptoStore } from '../config/prescriptoStore';
import { isMongoConnected } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { ExcelService, RowError } from '../services/excelService';

// Default password hash for imported accounts (password: "doc123")
const DEFAULT_DOC_PASSWORD_HASH = bcrypt.hashSync('doc123', 10);

// Helper to resolve hospital for the uploader
const resolveHospitalInfo = async (
  req: AuthRequest,
  requestedHospitalId?: string
): Promise<{ hospitalId: string; hospitalName: string }> => {
  const hospitalId =
    requestedHospitalId ||
    (req.user as any)?.hospitalId ||
    (req.query?.hospitalId as string) ||
    'hosp_lilavati';

  let hospitalName = 'Lilavati Hospital & Research Centre';

  if (isMongoConnected()) {
    const hosp = await Hospital.findById(hospitalId);
    if (hosp) hospitalName = hosp.name;
  } else {
    const hosp = prescriptoStore.hospitals.find(
      (h) => h._id === hospitalId || h.id === hospitalId
    );
    if (hosp) hospitalName = hosp.name;
  }

  return { hospitalId, hospitalName };
};

// =========================================================================
// 👨‍⚕️ 1. BULK UPLOAD DOCTORS VIA EXCEL
// POST /api/hospital/upload/doctors (and /api/hospital/upload-doctors)
// =========================================================================
export const uploadDoctorsExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: 'Please upload a valid Excel (.xlsx) file.' });
      return;
    }

    const { hospitalId, hospitalName } = await resolveHospitalInfo(req, req.body.hospitalId);
    let rows: Record<string, any>[] = [];

    try {
      rows = ExcelService.parseExcelBuffer(req.file.buffer);
    } catch (parseErr: any) {
      res.status(400).json({ success: false, message: parseErr.message });
      return;
    }

    const errors: RowError[] = [];
    const validDoctors: any[] = [];
    const seenEmailsInFile = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for 1-based index and header row

      const name = row.name || row.doctorname || row.fullname;
      const email = (row.email || row.doctoremail || '').toLowerCase().trim();
      const specialization =
        row.specialization || row.speciality || row.specialty || row.department;
      const phone = row.phone || row.contact || row.phonenumber || row.mobile;
      const degree = row.degree || row.qualification || 'MBBS, MD';
      const experience = row.experience || row.exp || '3 Years';
      const fees = Number(row.fees || row.consultationfees || row.fee) || 50;
      const about =
        row.about ||
        row.bio ||
        `${name || 'Specialist'} has dedicated medical experience delivering evidence-based clinical care.`;
      const address = row.address
        ? typeof row.address === 'string'
          ? { line1: row.address, line2: hospitalName }
          : row.address
        : { line1: `${hospitalName} Medical Wing`, line2: 'Bandra West, Mumbai' };
      const image =
        row.image ||
        row.avatar ||
        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400';

      // 1. Validate required fields
      if (!name) {
        errors.push({ row: rowNum, identifier: email || 'Unknown', reason: 'Missing required field: "name"' });
        continue;
      }
      if (!email) {
        errors.push({ row: rowNum, identifier: name, reason: 'Missing required field: "email"' });
        continue;
      }
      if (!ExcelService.isValidEmail(email)) {
        errors.push({ row: rowNum, identifier: email, reason: `Invalid email address format: "${email}"` });
        continue;
      }
      if (!specialization) {
        errors.push({ row: rowNum, identifier: email, reason: 'Missing required field: "specialization"' });
        continue;
      }

      // 2. Prevent duplicates within the same file
      if (seenEmailsInFile.has(email)) {
        errors.push({ row: rowNum, identifier: email, reason: `Duplicate email inside uploaded file: "${email}"` });
        continue;
      }
      seenEmailsInFile.add(email);

      // 3. Prevent duplicate check in Database / Memory store
      let emailExists = false;
      if (isMongoConnected()) {
        const existing = await Doctor.findOne({ email });
        if (existing) emailExists = true;
      } else {
        const existing = prescriptoStore.doctors.find(
          (d) => d.email?.toLowerCase().trim() === email
        );
        if (existing) emailExists = true;
      }

      if (emailExists) {
        errors.push({ row: rowNum, identifier: email, reason: `Doctor with email "${email}" already exists in system` });
        continue;
      }

      validDoctors.push({
        _id: `doc_${Date.now()}_${i}`,
        name,
        email,
        password: DEFAULT_DOC_PASSWORD_HASH,
        image,
        speciality: specialization,
        degree,
        experience,
        about,
        fees,
        address,
        available: true,
        phone: ExcelService.normalizePhone(phone),
        hospitalId,
        hospitalName,
        date: Date.now(),
        slots_booked: {},
      });
    }

    // Insert valid records
    if (validDoctors.length > 0) {
      if (isMongoConnected()) {
        await Doctor.insertMany(validDoctors);
        await Hospital.findByIdAndUpdate(hospitalId, {
          $inc: { doctorsCount: validDoctors.length },
        });
      } else {
        prescriptoStore.doctors.unshift(...validDoctors);
        const hosp = prescriptoStore.hospitals.find((h) => h._id === hospitalId || h.id === hospitalId);
        if (hosp) hosp.doctorsCount = (hosp.doctorsCount || 0) + validDoctors.length;
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk Doctor Upload Processed: ${validDoctors.length} inserted, ${errors.length} skipped`,
      totalRecords: rows.length,
      successfulUploads: validDoctors.length,
      failedRecords: errors.length,
      hospital: { hospitalId, hospitalName },
      errors,
      data: validDoctors.map(({ password, ...rest }) => rest),
    });
  } catch (error: any) {
    console.error('Bulk Doctor Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 🚑 2. BULK UPLOAD DRIVERS VIA EXCEL
// POST /api/hospital/upload/drivers (and /api/hospital/upload-drivers)
// =========================================================================
export const uploadDriversExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: 'Please upload a valid Excel (.xlsx) file.' });
      return;
    }

    const { hospitalId, hospitalName } = await resolveHospitalInfo(req, req.body.hospitalId);
    let rows: Record<string, any>[] = [];

    try {
      rows = ExcelService.parseExcelBuffer(req.file.buffer);
    } catch (parseErr: any) {
      res.status(400).json({ success: false, message: parseErr.message });
      return;
    }

    const errors: RowError[] = [];
    const validDrivers: any[] = [];
    const seenEmails = new Set<string>();
    const seenVehicles = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const name = row.name || row.drivername || row.fullname;
      const email = (row.email || row.driveremail || '').toLowerCase().trim();
      const phone = row.phone || row.driverphone || row.contact || row.mobile;
      const vehicleNumber = (
        row.vehiclenumber ||
        row.vehicleno ||
        row.vehicle ||
        row.registrationnumber ||
        ''
      ).toUpperCase().trim();
      const ambulanceType = (row.ambulancetype || row.type || 'ADVANCED').toUpperCase();

      // 1. Validate required fields
      if (!name) {
        errors.push({ row: rowNum, identifier: email || 'Unknown', reason: 'Missing required field: "name"' });
        continue;
      }
      if (!email) {
        errors.push({ row: rowNum, identifier: name, reason: 'Missing required field: "email"' });
        continue;
      }
      if (!ExcelService.isValidEmail(email)) {
        errors.push({ row: rowNum, identifier: email, reason: `Invalid email address: "${email}"` });
        continue;
      }
      if (!phone) {
        errors.push({ row: rowNum, identifier: email, reason: 'Missing required field: "phone"' });
        continue;
      }
      if (!vehicleNumber) {
        errors.push({ row: rowNum, identifier: email, reason: 'Missing required field: "vehicleNumber"' });
        continue;
      }

      // 2. Prevent in-file duplicate checks
      if (seenEmails.has(email)) {
        errors.push({ row: rowNum, identifier: email, reason: `Duplicate email inside file: "${email}"` });
        continue;
      }
      if (seenVehicles.has(vehicleNumber)) {
        errors.push({ row: rowNum, identifier: vehicleNumber, reason: `Duplicate vehicle number inside file: "${vehicleNumber}"` });
        continue;
      }
      seenEmails.add(email);
      seenVehicles.add(vehicleNumber);

      // 3. Database / Memory duplicate checks
      let vehicleOrEmailExists = false;
      if (isMongoConnected()) {
        const existing = await Ambulance.findOne({
          $or: [{ vehicleNumber }, { driverEmail: email }],
        });
        if (existing) vehicleOrEmailExists = true;
      } else {
        const existing = prescriptoStore.ambulances.find(
          (a) =>
            a.vehicleNumber?.toUpperCase() === vehicleNumber ||
            a.driverEmail?.toLowerCase().trim() === email
        );
        if (existing) vehicleOrEmailExists = true;
      }

      if (vehicleOrEmailExists) {
        errors.push({
          row: rowNum,
          identifier: `${vehicleNumber} / ${email}`,
          reason: `Driver with this email or vehicle number already exists in system`,
        });
        continue;
      }

      validDrivers.push({
        _id: `amb_${Date.now()}_${i}`,
        driverName: name,
        driverPhone: ExcelService.normalizePhone(phone),
        driverEmail: email,
        driverId: `driver_${Date.now()}_${i}`,
        vehicleNumber,
        ambulanceType: ['BASIC', 'ADVANCED', 'ICU', 'NEONATAL'].includes(ambulanceType)
          ? ambulanceType
          : 'ADVANCED',
        currentLocation: {
          lat: 19.0760,
          lng: 72.8777,
          address: 'Bandra West Junction, Mumbai',
          heading: 0,
          lastUpdated: new Date(),
        },
        isAvailable: true,
        currentStatus: 'IDLE' as const,
        assignedHospital: hospitalName,
        hospitalId,
        hospitalName,
        rating: 5.0,
        reviewCount: 0,
        equipmentList: ['Oxygen Tank', 'Defibrillator (AED)', 'ECG Monitor', 'Emergency Stretcher', 'Trauma Kit'],
      });
    }

    if (validDrivers.length > 0) {
      if (isMongoConnected()) {
        await Ambulance.insertMany(validDrivers);
        await Hospital.findByIdAndUpdate(hospitalId, {
          $inc: { driversCount: validDrivers.length },
        });
      } else {
        prescriptoStore.ambulances.unshift(...validDrivers);
        const hosp = prescriptoStore.hospitals.find((h) => h._id === hospitalId || h.id === hospitalId);
        if (hosp) hosp.driversCount = (hosp.driversCount || 0) + validDrivers.length;
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk Driver Upload Processed: ${validDrivers.length} inserted, ${errors.length} skipped`,
      totalRecords: rows.length,
      successfulUploads: validDrivers.length,
      failedRecords: errors.length,
      hospital: { hospitalId, hospitalName },
      errors,
      data: validDrivers,
    });
  } catch (error: any) {
    console.error('Bulk Driver Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 🏢 3. BULK UPLOAD HOSPITALS VIA EXCEL
// POST /api/superadmin/upload/hospitals (and /api/hospitals/upload)
// =========================================================================
export const uploadHospitalsExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: 'Please upload a valid Excel (.xlsx) file.' });
      return;
    }

    let rows: Record<string, any>[] = [];
    try {
      rows = ExcelService.parseExcelBuffer(req.file.buffer);
    } catch (parseErr: any) {
      res.status(400).json({ success: false, message: parseErr.message });
      return;
    }

    const errors: RowError[] = [];
    const validHospitals: any[] = [];
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const name = row.name || row.hospitalname;
      const address = row.address || row.location || row.streetaddress;
      const email = (row.email || row.adminemail || row.contactemail || '').toLowerCase().trim();
      const phone = row.phone || row.contactphone || row.contact || row.telephone;
      const city = row.city || 'Mumbai';
      const traumaLevel = row.traumalevel || row.trauma || 'Level 1 Apex Trauma Center';
      const totalBeds = Number(row.totalbeds || row.beds) || 200;
      const icuBedsAvailable = Number(row.icubeds || row.icubedsavailable) || 20;

      // 1. Validate required fields
      if (!name) {
        errors.push({ row: rowNum, identifier: email || 'Unknown', reason: 'Missing required field: "name"' });
        continue;
      }
      if (!address) {
        errors.push({ row: rowNum, identifier: name, reason: 'Missing required field: "address"' });
        continue;
      }
      if (!email) {
        errors.push({ row: rowNum, identifier: name, reason: 'Missing required field: "email"' });
        continue;
      }
      if (!ExcelService.isValidEmail(email)) {
        errors.push({ row: rowNum, identifier: email, reason: `Invalid email address: "${email}"` });
        continue;
      }
      if (!phone) {
        errors.push({ row: rowNum, identifier: email, reason: 'Missing required field: "phone"' });
        continue;
      }

      // 2. Prevent in-file duplicate check
      if (seenEmails.has(email)) {
        errors.push({ row: rowNum, identifier: email, reason: `Duplicate hospital email in file: "${email}"` });
        continue;
      }
      seenEmails.add(email);

      // 3. Database / Memory duplicate check
      let emailExists = false;
      if (isMongoConnected()) {
        const existing = await Hospital.findOne({ adminEmail: email });
        if (existing) emailExists = true;
      } else {
        const existing = prescriptoStore.hospitals.find(
          (h) => h.adminEmail?.toLowerCase().trim() === email
        );
        if (existing) emailExists = true;
      }

      if (emailExists) {
        errors.push({
          row: rowNum,
          identifier: email,
          reason: `Hospital with admin email "${email}" already exists`,
        });
        continue;
      }

      const id = `hosp_${Date.now()}_${i}`;
      validHospitals.push({
        _id: id,
        id,
        name,
        address,
        city,
        traumaLevel,
        totalBeds,
        icuBedsAvailable,
        adminEmail: email,
        adminId: `admin_${id}`,
        contactPhone: ExcelService.normalizePhone(phone),
        isActive: true,
        doctorsCount: 0,
        driversCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (validHospitals.length > 0) {
      if (isMongoConnected()) {
        await Hospital.insertMany(validHospitals);
      } else {
        prescriptoStore.hospitals.unshift(...validHospitals);
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk Hospital Upload Processed: ${validHospitals.length} inserted, ${errors.length} skipped`,
      totalRecords: rows.length,
      successfulUploads: validHospitals.length,
      failedRecords: errors.length,
      errors,
      data: validHospitals,
    });
  } catch (error: any) {
    console.error('Bulk Hospital Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
