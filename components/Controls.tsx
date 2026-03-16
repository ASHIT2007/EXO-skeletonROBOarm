import React from 'react';
import { SystemStatus, ViewMode, JointState, GestureMode } from '../types';
import { Power, RefreshCw, Eye, Box, Zap, Link, Usb, Settings } from 'lucide-react';

interface ControlsProps {
  power: boolean;
  joints: JointState;
  gestureMode: GestureMode;
  safetyThreshold: number;
  pressure: number;
  heat: number;
  vibration: number;
  status: SystemStatus;
  viewMode: ViewMode;
  isTactileMode: boolean;
  isSerialConnected: boolean;
  isTracking: boolean;
  isDrawerOpen: boolean;
  servoAngle: number;
  onPowerToggle: () => void;
  onJointChange: (joint: keyof JointState, val: number) => void;
  onAngleChange: (val: number) => void;
  onThresholdChange: (val: number) => void;
  onHeatChange: (val: number) => void;
  onVibrationChange: (val: number) => void;
  onPermissiveToggle?: () => void;
  onReboot: () => void;
  onViewModeToggle: () => void;
  onTactileModeToggle: () => void;
  onConnect: () => void;
  onGestureModeToggle?: () => void;
  onGestureModeTo?: (mode: GestureMode) => void;
  onGesturePanelToggle: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  power,
  joints,
  gestureMode,
  safetyThreshold,
  status,
  viewMode,
  isTactileMode,
  isSerialConnected,
  isTracking,
  isDrawerOpen,
  onPowerToggle,
  onJointChange,
  onThresholdChange,
  onReboot,
  onViewModeToggle,
  onTactileModeToggle,
  onConnect,
  onGestureModeToggle,
  onGestureModeTo,
  onGesturePanelToggle,
}) => {
  const isCritical = status === SystemStatus.CRITICAL || status === SystemStatus.GESTURE_LOSS;
  const isRebooting = status === SystemStatus.REBOOTING;
  
  // USER REQUIREMENT: Keep manual controls active if no video detected/tracking lost
  // We only block interaction if tracking is healthy AND Live mode is active (mirroring is taking over)
  const isGestureMirroring = gestureMode === 'LIVE' && isTracking;

  const handleModeClick = (m: GestureMode) => {
    if (onGestureModeTo) {
      onGestureModeTo(m);
    } else if (onGestureModeToggle) {
      onGestureModeToggle();
    }
  };

  return (
    <div className="w-full bg-black/90 border-t border-cyan-500/20 backdrop-blur-xl p-4 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">

      <div className="flex gap-4 border-r border-white/5 pr-6">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Interfaces</label>
          <div className="flex gap-2">
            <button onClick={onConnect} disabled={isSerialConnected} className={`p-2 border rounded ${isSerialConnected ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
              {isSerialConnected ? <Link size={18} /> : <Usb size={18} />}
            </button>
            <button onClick={onTactileModeToggle} className={`p-2 border rounded ${isTactileMode ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'}`}>
              <Zap size={18} />
            </button>
            <button onClick={onViewModeToggle} className={`p-2 border rounded ${viewMode === 'wireframe' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
              {viewMode === 'wireframe' ? <Eye size={18} /> : <Box size={18} />}
            </button>
            <button onClick={onGesturePanelToggle} className={`p-2 border rounded transition-all ${isDrawerOpen ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-cyan-400'}`}>
              <Settings size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 ml-4 pl-4 border-l border-white/5">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Mirror Status</label>
          <div className="flex bg-white/5 rounded p-0.5 border border-white/10">
            {['DISABLED', 'SHADOW', 'LIVE'].map((m) => (
              <button
                key={m}
                onClick={() => handleModeClick(m as GestureMode)}
                className={`px-3 py-1 text-[8px] font-black uppercase transition-all duration-300 rounded-sm ${
                  gestureMode === m 
                  ? (m === 'LIVE' ? 'bg-red-500 text-white' : 'bg-cyan-500 text-black')
                  : 'text-white/40 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex-grow flex gap-4 px-8 overflow-hidden transition-all duration-300 relative ${isCritical ? 'opacity-30 grayscale-[0.8] pointer-events-none' : ''}`}>
        {isCritical && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-[2px] rounded">
            <span className="px-4 py-1 rounded text-[10px] font-black tracking-widest animate-pulse bg-red-600 text-white">
              SYSTEM_LOCKED_ALARM
            </span>
          </div>
        )}
        
        {/* If gesture mirroring is active, we show a subtle indicator but don't block manual sliders unless tracking is healthy */}
        {isGestureMirroring && (
           <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
             <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded text-[7px] font-black tracking-tighter">GESTURE_CTRL_OVERRIDE</span>
           </div>
        )}
        
        <div className="flex gap-6 items-center">
          {(['j1', 'j2', 'j3', 'j4'] as const).map((key) => {
            const val = joints[key];
            const isManualActive = gestureMode !== 'LIVE' || !isTracking;
            
            return (
              <div key={key} className={`flex flex-col items-center group transition-all duration-500 ${!isManualActive ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 transition-colors ${!isManualActive ? 'text-white/20' : 'text-cyan-500/70 group-hover:text-cyan-400'}`}>
                  {key}
                </span>
                <div className={`relative flex items-center gap-2 bg-white/5 px-2 py-1 rounded border transition-all ${!isManualActive ? 'border-white/5' : 'border-cyan-500/20 hover:border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.05)]'}`}>
                  <input 
                    type="range"
                    min="0"
                    max="180"
                    value={val}
                    disabled={!power || isCritical || !isManualActive}
                    onChange={(e) => onJointChange(key, parseInt(e.target.value))}
                    className="w-16 h-1 bg-cyan-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:accent-gray-700"
                  />
                  <span className={`text-[10px] font-mono font-bold w-7 text-right ${val > safetyThreshold ? 'text-red-500' : (isManualActive ? 'text-cyan-400' : 'text-cyan-900')}`}>
                    {Math.round(val)}°
                  </span>
                </div>
                {!isManualActive && (
                  <div className="absolute -bottom-4 text-[6px] font-bold text-cyan-500/40 tracking-tighter">AI_LINKED</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 pl-8 border-l border-white/5 text-[10px] font-black uppercase">
        <div className="flex flex-col items-end gap-1 px-4 group">
             <span className="text-gray-600 tracking-tighter text-[8px] group-hover:text-cyan-500 transition-colors">Safety_Limit</span>
             <div className="flex items-center gap-2">
               <input 
                 type="range"
                 min="90"
                 max="180"
                 step="1"
                 value={safetyThreshold}
                 onChange={(e) => onThresholdChange(parseInt(e.target.value))}
                 className="w-16 h-1 bg-red-900/50 rounded-lg appearance-none cursor-pointer accent-red-500"
               />
               <span className="text-white tracking-widest font-mono w-8 text-right">{safetyThreshold}°</span>
             </div>
        </div>
        <button 
           onClick={onReboot} 
           disabled={!isCritical || isRebooting} 
           className={`px-6 py-2 border rounded-sm font-black tracking-widest transition-all duration-500
                ${isCritical 
                   ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_20px_rgba(255,0,0,0.5)]' 
                   : 'opacity-20 border-white/10 text-white/40 grayscale'}`}
        >
          {isRebooting ? <span className="flex items-center gap-2">REBOOTING... <RefreshCw size={14} className="animate-spin" /></span> : 'CLR_ESTOP_RESET'}
        </button>
        <button onClick={onPowerToggle} className={`h-14 px-6 border-2 flex flex-col items-center justify-center gap-1 rounded transition-colors ${power ? 'bg-red-600 border-red-500 hover:bg-red-700 shadow-[0_0_20px_rgba(255,0,0,0.2)]' : 'bg-green-600 border-green-500 hover:bg-green-700'}`}>
          <Power size={24} />
          <span className="text-[10px] font-black tracking-widest uppercase">{power ? 'ESTOP_KILL' : 'SYS_BOOT'}</span>
        </button>
      </div>
    </div>
  );
};
