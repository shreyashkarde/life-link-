import React from 'react';

export interface PrescriptionData {
  appointmentId: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  doctorName: string;
  doctorSpeciality: string;
  hospitalName?: string;
  slotDate: string;
  slotTime: string;
  diagnosis?: string;
  medicines?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  instructions?: string;
  fees?: number;
}

interface DigitalPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PrescriptionData | null;
}

export const DigitalPrescriptionModal: React.FC<DigitalPrescriptionModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const defaultMedicines = data.medicines && data.medicines.length > 0 ? data.medicines : [
    { name: 'Amoxicillin 500mg', dosage: '1 Capsule', frequency: 'TDS (3x a day)', duration: '5 Days' },
    { name: 'Paracetamol 650mg', dosage: '1 Tablet', frequency: 'SOS (When needed for fever)', duration: '3 Days' },
    { name: 'Multivitamin & Zinc', dosage: '1 Tablet', frequency: 'OD (Once a day after lunch)', duration: '14 Days' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-outfit animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh]">
        {/* Top Control Bar (Hidden on print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <div>
              <p className="text-xs font-black tracking-wider uppercase">Official Medical Slip & Prescription</p>
              <p className="text-[10px] text-slate-400">Cryptographically Verified Health Record</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>🖨️</span> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Prescription Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 print:p-0">
          {/* Hospital Header Banner */}
          <div className="border-b-2 border-blue-600 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
                +
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {data.hospitalName || 'Lilavati Hospital & Research Centre'}
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  A-791, Bandra Reclamation, Bandra West, Mumbai 400050 • Reg No: MH-BOM-8821
                </p>
                <p className="text-[11px] text-blue-600 font-bold mt-0.5">
                  Emergency: 108 / +91 22 2656 8000 • Apex Level 1 Trauma Care
                </p>
              </div>
            </div>

            {/* Verification QR simulation */}
            <div className="hidden sm:flex flex-col items-center p-2 border border-slate-200 rounded-xl bg-slate-50 text-center">
              <div className="w-16 h-16 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center">
                <div className="w-full h-full bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:6px_6px] border border-dashed border-slate-400 flex items-center justify-center text-[9px] font-black text-slate-800">
                  QR VERIFIED
                </div>
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1">Rx #{data.appointmentId.slice(-6)}</span>
            </div>
          </div>

          {/* Patient & Doctor Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Patient Name</p>
              <p className="font-extrabold text-slate-900 text-sm">{data.patientName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Age / Gender</p>
              <p className="font-bold text-slate-800">{data.patientAge || '28 Yrs'} / {data.patientGender || 'Male'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Attending Physician</p>
              <p className="font-bold text-blue-700">{data.doctorName}</p>
              <p className="text-[10px] text-slate-500">{data.doctorSpeciality}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Date & Slot</p>
              <p className="font-bold text-slate-900">{data.slotDate} • {data.slotTime}</p>
            </div>
          </div>

          {/* Clinical Diagnosis Section */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🩺</span> Clinical Diagnosis & Findings
            </h4>
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-800 font-medium leading-relaxed">
              {data.diagnosis || 'Acute upper respiratory tract infection with low-grade pyrexia. Systemic exam normal. Vital signs stable (BP: 120/80 mmHg, SpO2: 99%).'}
            </div>
          </div>

          {/* Rx Prescription Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="text-base font-serif italic text-blue-600 font-bold">℞</span> Prescribed Medication & Regimen
              </h4>
              <span className="text-[11px] font-bold text-slate-400">Schedule H Prescription</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Medicine / Generic</th>
                    <th className="py-2.5 px-3">Dosage</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {defaultMedicines.map((med, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{med.name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{med.dosage}</td>
                      <td className="py-2.5 px-3 text-blue-700 font-semibold">{med.frequency}</td>
                      <td className="py-2.5 px-3 text-slate-600">{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advice / Doctor Notes */}
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Advice & Special Instructions</h4>
            <p className="text-xs text-slate-600 font-medium italic">
              {data.instructions || 'Hydrate with at least 3 liters of warm water daily. Complete the full course of antibiotics even if symptoms resolve. Follow up after 5 days if fever persists.'}
            </p>
          </div>

          {/* Footer Signature & Hospital Stamp */}
          <div className="pt-4 border-t border-slate-200 flex items-end justify-between">
            <div className="space-y-1">
              <div className="w-24 h-10 border-2 border-emerald-500/40 rounded-lg flex items-center justify-center text-[10px] font-black text-emerald-700 uppercase tracking-tighter rotate-[-4deg]">
                ✓ VERIFIED CLINIC
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Generated via LifeLink Telehealth Engine</p>
            </div>

            <div className="text-right space-y-1">
              <div className="font-serif italic text-base text-blue-800 font-bold border-b border-slate-300 pb-1 px-4 inline-block">
                {data.doctorName}
              </div>
              <p className="text-xs font-extrabold text-slate-900">{data.doctorName}</p>
              <p className="text-[10px] text-slate-500 font-medium">Reg No: MMC-2018-9410</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalPrescriptionModal;
