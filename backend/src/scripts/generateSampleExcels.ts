import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const samplesDir = path.resolve(__dirname, '../../samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// 1. Doctors Sample Data
const doctorsData = [
  {
    name: 'Dr. Arjun Kapoor',
    email: 'arjun.kapoor@prescripto.com',
    specialization: 'Cardiologist',
    phone: '+91 98201 11223',
    degree: 'MBBS, MD, DM (Cardiology)',
    experience: '7 Years',
    fees: 70,
    about: 'Senior Interventional Cardiologist specializing in preventive cardiology and coronary angiography.',
  },
  {
    name: 'Dr. Ananya Sharma',
    email: 'ananya.sharma@prescripto.com',
    specialization: 'Dermatologist',
    phone: '+91 98202 22334',
    degree: 'MBBS, MD (Dermatology)',
    experience: '5 Years',
    fees: 45,
    about: 'Consultant Dermatologist and Trichologist focused on clinical and aesthetic skin care.',
  },
  {
    name: 'Dr. Rohan Verma',
    email: 'rohan.verma@prescripto.com',
    specialization: 'Neurologist',
    phone: '+91 98203 33445',
    degree: 'MBBS, DM (Neurology)',
    experience: '8 Years',
    fees: 80,
    about: 'Neuro-physician managing stroke rehabilitation, epilepsy, and migraine treatment.',
  },
];

const docWorksheet = XLSX.utils.json_to_sheet(doctorsData);
const docWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(docWorkbook, docWorksheet, 'Doctors');
XLSX.writeFile(docWorkbook, path.join(samplesDir, 'sample_doctors.xlsx'));

// 2. Drivers Sample Data
const driversData = [
  {
    name: 'Vikas Deshmukh',
    email: 'driver.vikas@prescripto.com',
    phone: '+91 98111 22334',
    vehicleNumber: 'MH-01-EQ-5566',
    ambulanceType: 'ADVANCED',
  },
  {
    name: 'Ramesh Sawant',
    email: 'driver.ramesh@prescripto.com',
    phone: '+91 98112 33445',
    vehicleNumber: 'MH-02-AB-7788',
    ambulanceType: 'ICU',
  },
];

const driverWorksheet = XLSX.utils.json_to_sheet(driversData);
const driverWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(driverWorkbook, driverWorksheet, 'Drivers');
XLSX.writeFile(driverWorkbook, path.join(samplesDir, 'sample_drivers.xlsx'));

// 3. Hospitals Sample Data
const hospitalsData = [
  {
    name: 'Hinduja Healthcare Surgical',
    address: '11th Road, Khar West, Mumbai',
    email: 'hinduja.admin@prescripto.com',
    phone: '+91 22 2646 9999',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Trauma Center',
    totalBeds: 250,
    icuBedsAvailable: 18,
  },
  {
    name: 'Nanavati Max Super Speciality Hospital',
    address: 'SV Road, Vile Parle West, Mumbai',
    email: 'nanavati.admin@prescripto.com',
    phone: '+91 22 2626 7500',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Apex Trauma Center',
    totalBeds: 350,
    icuBedsAvailable: 25,
  },
];

const hospWorksheet = XLSX.utils.json_to_sheet(hospitalsData);
const hospWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(hospWorkbook, hospWorksheet, 'Hospitals');
XLSX.writeFile(hospWorkbook, path.join(samplesDir, 'sample_hospitals.xlsx'));

console.log('✅ Generated 3 sample Excel template files in:', samplesDir);
