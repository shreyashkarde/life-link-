import React, { useState } from 'react';
import soundService from '../../services/soundService';

interface TriageResult {
  level: 'CRITICAL' | 'URGENT' | 'ROUTINE';
  badgeTitle: string;
  badgeColor: string;
  recommendedSpeciality: string;
  recommendedAction: string;
  hospitalRecommendation: string;
  clinicalExplanation: string;
  requiresAmbulance: boolean;
}

interface AiTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerSOS: () => void;
  onBookDoctor: (speciality: string) => void;
}

const PRESET_SYMPTOMS = [
  'Severe Chest Pain & Left Arm Radiation',
  'Difficulty Breathing & Wheezing',
  'High Fever with Shivering (103°F)',
  'Sudden Dizziness & Fainting',
  'Accidental Trauma / Deep Bleeding',
  'Persistent Migraine & Visual Halos',
  'Seasonal Allergy & Sneezing',
];

export const AiTriageModal: React.FC<AiTriageModalProps> = ({
  isOpen,
  onClose,
  onTriggerSOS,
  onBookDoctor,
}) => {
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  if (!isOpen) return null;

  const performTriage = (symptomStr: string) => {
    setAnalyzing(true);
    setResult(null);

    // Dynamic AI Medical Triage Logic
    setTimeout(() => {
      const lower = symptomStr.toLowerCase();

      let triageResult: TriageResult;

      if (
        lower.includes('chest') ||
        lower.includes('heart') ||
        lower.includes('breath') ||
        lower.includes('unconscious') ||
        lower.includes('bleeding') ||
        lower.includes('trauma') ||
        lower.includes('faint') ||
        lower.includes('stroke')
      ) {
        soundService.playEmergencySiren(1.2);
        triageResult = {
          level: 'CRITICAL',
          badgeTitle: '🚨 CODE-RED: Immediate Trauma / Emergency Dispatch',
          badgeColor: 'bg-rose-500 text-white border-rose-600',
          recommendedSpeciality: 'Emergency Medicine / Cardiology',
          recommendedAction: 'Immediate Ambulance SOS Dispatched to Nearest Level 1 Trauma Center',
          hospitalRecommendation: 'Lilavati Hospital & Research Centre (Emergency Resuscitation Unit)',
          clinicalExplanation:
            'Symptoms indicate potential cardiac, respiratory, or acute trauma distress. Immediate paramedic stabilization and continuous oxygen telemetry are required.',
          requiresAmbulance: true,
        };
      } else if (
        lower.includes('fever') ||
        lower.includes('shivering') ||
        lower.includes('pain') ||
        lower.includes('migraine') ||
        lower.includes('vomit') ||
        lower.includes('stomach')
      ) {
        soundService.playSuccessChime();
        triageResult = {
          level: 'URGENT',
          badgeTitle: '🟡 PRIORITY: Same-Day Clinical Consultation',
          badgeColor: 'bg-amber-500 text-white border-amber-600',
          recommendedSpeciality: 'General Physician',
          recommendedAction: 'Book Priority Slot with Dr. Richard James at Lilavati OPD',
          hospitalRecommendation: 'Lilavati Hospital & Research Centre (Outpatient Clinic)',
          clinicalExplanation:
            'Symptoms suggest systemic infection, metabolic response, or acute migraine. Medical evaluation and symptomatic prescription are strongly recommended today.',
          requiresAmbulance: false,
        };
      } else {
        soundService.playSuccessChime();
        triageResult = {
          level: 'ROUTINE',
          badgeTitle: '🟢 ROUTINE: Elective Consultation & Wellness',
          badgeColor: 'bg-emerald-500 text-white border-emerald-600',
          recommendedSpeciality: 'General Physician',
          recommendedAction: 'Schedule Teleconsultation or Routine In-Clinic Review',
          hospitalRecommendation: 'Lilavati Hospital & Research Centre (Wellness Desk)',
          clinicalExplanation:
            'Non-acute presentation. Can be safely managed with standard scheduled consultation and lifestyle or pharmacological recommendations.',
          requiresAmbulance: false,
        };
      }

      setResult(triageResult);
      setAnalyzing(false);
    }, 600);
  };

  const handlePresetClick = (preset: string) => {
    setInputText(preset);
    performTriage(preset);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    performTriage(inputText);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-outfit animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">Smart AI Health Triage & Symptom Checker</h3>
              <p className="text-[11px] text-blue-200 font-medium">Algorithmic Emergency Risk Stratification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Quick Preset Buttons */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Quick Symptoms (Tap to Analyze):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SYMPTOMS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input Field */}
          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Or describe how you feel in detail:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. high fever since morning, shivering and dry cough..."
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-600 transition-all"
              />
              <button
                type="submit"
                disabled={analyzing || !inputText.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {analyzing ? 'Analyzing...' : 'Triage AI'}
              </button>
            </div>
          </form>

          {/* Analysis Result Card */}
          {result && (
            <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${result.badgeColor}`}>
                  {result.badgeTitle}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <p>
                  <strong className="text-slate-900 font-extrabold">Clinical Assessment:</strong> {result.clinicalExplanation}
                </p>
                <p>
                  <strong className="text-slate-900 font-extrabold">Recommended Facility:</strong> {result.hospitalRecommendation}
                </p>
                <p>
                  <strong className="text-slate-900 font-extrabold">Specialist:</strong> {result.recommendedSpeciality}
                </p>
              </div>

              {/* Direct Next Action Buttons */}
              <div className="pt-2">
                {result.requiresAmbulance ? (
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerSOS();
                    }}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer animate-pulse"
                  >
                    <span>🚨</span>
                    <span>TRIGGER EMERGENCY AMBULANCE SOS (1-TAP)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      onBookDoctor(result.recommendedSpeciality);
                    }}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-md hover:shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>📅</span>
                    <span>BOOK APPOINTMENT WITH DR. RICHARD JAMES</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiTriageModal;
