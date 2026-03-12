import React from 'react';
import { X, Settings, RotateCcw, Activity } from 'lucide-react';
import { SystemState, JointState } from '../types';

interface GestureControlPanelProps {
  state: SystemState;
  onSmoothingChange: (val: number) => void;
  onRecalibrate: () => void;
  onToggleFreeze: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const GestureControlPanel: React.FC<GestureControlPanelProps> = ({
  state,
  onSmoothingChange,
  onRecalibrate,
  onToggleFreeze,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const confidenceColor = state.gestureConfidence >= 0.85 ? 'bg-green-500' : state.gestureConfidence >= 0.7 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="fixed right-0 top-20 bottom-24 w-72 bg-black/90 border-l border-cyan-500/20 backdrop-blur-xl z-30 transition-all duration-500 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] pointer-events-auto">
      <div className="h-full flex flex-col p-6 overflow-y-auto overflow-x-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Settings className="text-cyan-400" size={18} />
            <span className="text-sm font-black uppercase tracking-widest text-white">Gesture_Control</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Global Status Bar */}
        <div className="bg-white/5 border border-white/10 p-4 rounded mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-white/60 uppercase">System Confidence</span>
            <span className={`text-[10px] font-mono font-bold ${state.gestureConfidence > 0.8 ? 'text-green-500' : 'text-amber-500'}`}>
              {(state.gestureConfidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${confidenceColor}`} 
              style={{ width: `${state.gestureConfidence * 100}%` }}
            />
          </div>
        </div>

        {/* Joint Deltas */}
        <div className="space-y-4 mb-8">
          <label className="text-[10px] font-black uppercase tracking-widest text-cyan-500/60 flex items-center gap-2">
            <Activity size={12} /> Joint_Delta Monitoring
          </label>
          {Object.entries(state.joints).map(([key, val]) => {
            const ghostVal = (state.ghostJoints as any)[key];
            const delta = Math.abs(val - ghostVal);
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-mono font-bold text-white/40 uppercase">{key}</span>
                  <span className="text-[10px] font-mono text-cyan-400">Δ {delta.toFixed(1)}°</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-cyan-500/50" 
                    style={{ width: `${(val / 180) * 100}%` }}
                  />
                  <div 
                    className="absolute top-0 left-0 h-full border-r-2 border-white/80" 
                    style={{ width: `${(ghostVal / 180) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="space-y-6 mt-auto">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-white/40 uppercase flex justify-between">
              Smoothing Alpha 
              <span className="text-white">{state.gestureSmoothing.toFixed(2)}</span>
            </label>
            <input 
              type="range"
              min="0.05"
              max="0.5"
              step="0.01"
              value={state.gestureSmoothing}
              onChange={(e) => onSmoothingChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 appearance-none cursor-pointer rounded-full accent-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onRecalibrate}
              className="flex flex-col items-center justify-center p-3 border border-white/10 rounded-sm bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all gap-1"
            >
              <RotateCcw size={16} className="text-cyan-400" />
              <span className="text-[8px] font-black uppercase tracking-tighter">Recalibrate</span>
            </button>
            <button 
              onClick={onToggleFreeze}
              className={`flex flex-col items-center justify-center p-3 border rounded-sm transition-all gap-1 ${
                state.isGestureFrozen 
                ? 'bg-red-500/20 border-red-500 text-red-500' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current mb-0.5 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-tighter">
                {state.isGestureFrozen ? 'LOCKED' : 'FREEZE'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
