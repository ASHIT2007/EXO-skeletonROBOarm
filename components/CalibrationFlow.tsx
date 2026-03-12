import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { CalibrationProfile, JointState } from '../types';

interface CalibrationFlowProps {
  onComplete: (profile: CalibrationProfile) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 'neutral', label: 'Hold hand flat, fingers together', sub: 'Captures neutral/zero pose' },
  { id: 'fist', label: 'Make a tight fist', sub: 'Captures minimum gripper state' },
  { id: 'extend', label: 'Fully extend all fingers', sub: 'Captures maximum extension' },
  { id: 'left', label: 'Rotate wrist left fully', sub: 'Captures J1 minimum' },
  { id: 'right', label: 'Rotate wrist right fully', sub: 'Captures J1 maximum' }
];

export const CalibrationFlow: React.FC<CalibrationFlowProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);
  const [tempProfile, setTempProfile] = useState<Partial<CalibrationProfile>>({});

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && !isCapturing) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (countdown === 0 && !isCapturing) {
      captureStep();
    }
    return () => clearTimeout(timer);
  }, [countdown, isCapturing]);

  const captureStep = () => {
    setIsCapturing(true);
    // Simulate capture delay
    setTimeout(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
        setCountdown(3);
        setIsCapturing(false);
      } else {
        // Mock final profile
        onComplete({
          offsets: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 },
          minMax: { j1: [0, 180], j6: [0, 180] }
        });
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-lg p-8 shadow-[0_0_50px_rgba(0,240,255,0.1)] relative overflow-hidden">
        {/* Progress Background */}
        <div className="absolute top-0 left-0 h-1 bg-cyan-500 transition-all duration-500" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />

        <div className="flex flex-col items-center text-center">
          <div className="mb-6 relative">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 flex items-center justify-center">
              {isCapturing ? (
                <CheckCircle className="text-green-500 animate-bounce" size={32} />
              ) : (
                <span className="text-3xl font-black text-cyan-400">{countdown}</span>
              )}
            </div>
            {/* SVG Ghost Hand Illustration (Simplified) */}
            <div className="mt-4 text-cyan-500/40">
               <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                  <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                  <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                  <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
               </svg>
            </div>
          </div>

          <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">{STEPS[currentStep].label}</h2>
          <p className="text-sm text-cyan-500/60 mb-8">{STEPS[currentStep].sub}</p>

          <div className="w-full flex justify-center gap-4">
             {STEPS.map((_, i) => (
                <div key={i} className={`h-1 w-8 rounded-full ${i <= currentStep ? 'bg-cyan-500' : 'bg-white/10'}`} />
             ))}
          </div>

          <button 
            onClick={onCancel}
            className="mt-8 text-[10px] font-bold text-white/40 hover:text-red-500 uppercase tracking-widest transition-colors"
          >
            Abort Calibration
          </button>
        </div>

        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      </div>
    </div>
  );
};
