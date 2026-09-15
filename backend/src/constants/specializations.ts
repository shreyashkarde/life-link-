export const MEDICAL_SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Orthopedic',
  'Neurologist',
  'Gynecologist',
  'ENT Specialist',
  'Psychiatrist',
  'Oncologist',
  'Pulmonologist',
  'Ophthalmologist',
  'Gastroenterologist',
  'Urologist',
  'Radiologist',
  'Emergency Medicine Specialist',
  'Nephrologist',
  'Endocrinologist',
] as const;

export type MedicalSpecialization = (typeof MEDICAL_SPECIALIZATIONS)[number];
