import React from 'react';
import { Settings, RefreshCw, Hand, Activity, Zap } from 'lucide-react';

interface HandControlPanelProps {
  fingerValues: number[]; // 5 fingers
  wristValue: number;
  baseValue: number;
  isLive: boolean;
  onFingerChange: (idx: number, val: number) => void;
  onWristChange: (val: number) => void;
  onBaseChange: (val: number) => void;
  onLiveToggle: () => void;
  onReset: () => void;
  onPreset: (preset: string) => void;
}

export const HandControlPanel: React.FC<HandControlPanelProps> = ({
  fingerValues,
  wristValue,
  baseValue,
  isLive,
  onFingerChange,
  onWristChange,
  onBaseChange,
  onLiveToggle,
  onReset,
  onPreset
}) => {
  const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

  return (
    <div className="absolute top-24 left-4 z-50 flex flex-col gap-4 pointer-events-auto">
      {/* Main HUD Container */}
      <div className="bg-black/60 backdrop-blur-xl border border-cyan-800/50 p-6 rounded-lg shadow-2xl w-72 flex flex-col gap-6 select-none animate-in fade-in slide-in-from-left-4 duration-500">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-cyan-900/50 pb-3">
          <div className="flex items-center gap-2">
            <Hand size={16} className="text-cyan-400" />
            <span className="text-xs font-mono font-black text-cyan-400 tracking-widest uppercase">Neural_Interface_HUD</span>
          </div>
          <button 
            onClick={onLiveToggle}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black transition-all ${
              isLive ? 'bg-red-500/20 border border-red-500 text-red-500 animate-pulse' : 'bg-cyan-500/10 border border-cyan-500 text-cyan-400'
            }`}
          >
            <Activity size={12} />
            {isLive ? 'LIVE_STREAMING' : 'MANUAL_MODE'}
          </button>
        </div>

        {/* Presets Row */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-black text-cyan-600 uppercase tracking-widest font-mono">Grip_Presets</span>
          <div className="grid grid-cols-4 gap-2">
            {['OPEN', 'FIST', 'PINCH', 'POINT'].map((preset) => (
              <button
                key={preset}
                onClick={() => onPreset(preset)}
                className="border border-cyan-800 bg-cyan-900/10 hover:bg-cyan-900/40 text-[8px] font-black py-2 rounded-xs text-cyan-400 transition-colors uppercase font-mono"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Finger Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-cyan-600 uppercase tracking-widest font-mono">Neural_Actuators</span>
            {isLive && <span className="text-[7px] text-red-400 font-mono animate-pulse uppercase">Read_Only_AI_Feed</span>}
          </div>
          
          <div className="flex flex-col gap-3">
            {fingerNames.map((name, i) => (
              <div key={name} className="flex flex-col gap-1.5 group">
                <div className="flex justify-between text-[9px] font-mono font-bold uppercase transition-colors group-hover:text-cyan-400">
                  <span className="text-gray-400">{name}</span>
                  <span className="text-cyan-500">{Math.round(fingerValues[i])}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={fingerValues[i]}
                  disabled={isLive}
                  onChange={(e) => onFingerChange(i, parseInt(e.target.value))}
                  className="w-full h-1 bg-cyan-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30 transition-opacity"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Orientation Controls */}
        <div className="flex flex-col gap-4 pt-2 border-t border-cyan-900/30">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase font-black">Wrist_Tilt</span>
              <input
                type="range"
                min="-90"
                max="90"
                value={wristValue}
                disabled={isLive}
                onChange={(e) => onWristChange(parseInt(e.target.value))}
                className="w-full h-1 bg-cyan-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
              />
              <span className="text-[10px] font-mono text-cyan-500">{wristValue}°</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase font-black">Base_Rot</span>
              <input
                type="range"
                min="-180"
                max="180"
                value={baseValue}
                disabled={isLive}
                onChange={(e) => onBaseChange(parseInt(e.target.value))}
                className="w-full h-1 bg-cyan-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
              />
              <span className="text-[10px] font-mono text-cyan-500">{baseValue}°</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-2">
          <button 
            onClick={onReset}
            className="flex-grow flex items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-400 py-3 rounded-sm text-[10px] font-black tracking-widest transition-all"
          >
            <RefreshCw size={14} />
            RESET_JOINTS
          </button>
        </div>
      </div>

      {/* Connection Status Badge */}
      <div className="bg-black/40 backdrop-blur-md border border-cyan-900/50 px-4 py-2 rounded-full flex items-center gap-3 w-fit animate-in fade-in slide-in-from-left-2 duration-700 delay-300">
        <div className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-cyan-500 shadow-[0_0_8px_#00f0ff]'}`} />
        <span className="text-[8px] font-black text-white/50 tracking-[0.2em] font-mono uppercase">Neural_Link: {isLive ? 'ACTIVE_DATA_STREAM' : 'LOCAL_COMMAND_WAIT'}</span>
      </div>
    </div>
  );
};
