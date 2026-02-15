import React from 'react';
import { SystemStatus, ViewMode } from '../types';
import { Power, RefreshCw, AlertTriangle, Eye, Box, Zap, Scan, ShieldCheck, Link, Usb } from 'lucide-react';

interface ControlsProps {
  power: boolean;
  servoAngle: number;
  safetyThreshold: number;
  objectPosition: number;
  pressure: number;
  heat: number; // Simulated
  vibration: number; // Simulated
  manualHeat?: number; // User Setpoint
  manualVibration?: number; // User Setpoint
  manualPermissive?: boolean; // New: For AND Gate Logic
  status: SystemStatus;
  viewMode: ViewMode;
  isTactileMode: boolean;
  isSerialConnected: boolean; // New prop
  onPowerToggle: () => void;
  onAngleChange: (val: number) => void;
  onThresholdChange: (val: number) => void;
  onObjectPositionChange: (val: number) => void;
  onHeatChange: (val: number) => void; // New
  onVibrationChange: (val: number) => void; // New
  onPermissiveToggle?: () => void; // New
  onReboot: () => void;
  onViewModeToggle: () => void;
  onTactileModeToggle: () => void;
  onConnect: () => void; // New prop
}

export const Controls: React.FC<ControlsProps> = ({
  power,
  servoAngle,
  safetyThreshold,
  objectPosition,
  pressure,
  heat,
  vibration,
  manualHeat,
  manualVibration,
  manualPermissive,
  status,
  viewMode,
  isTactileMode,
  isSerialConnected,
  onPowerToggle,
  onAngleChange,
  onThresholdChange,
  onObjectPositionChange,
  onHeatChange,
  onVibrationChange,
  onPermissiveToggle,
  onReboot,
  onViewModeToggle,
  onTactileModeToggle,
  onConnect
}) => {
  const isCritical = status === SystemStatus.CRITICAL;
  const isRebooting = status === SystemStatus.REBOOTING;
  const isReflexActive = pressure > 50;

  return (
    <div className="w-full bg-black/80 border-t border-cyan-500/30 backdrop-blur-md p-4 flex flex-wrap gap-8 items-end justify-between shadow-[0_-5px_20px_rgba(0,240,255,0.1)]">
      
      {/* 1. Hardware Connection */}
      <div className="flex flex-col gap-2 border-r border-cyan-900/50 pr-6">
        <label className="text-xs tracking-widest text-cyan-500 font-bold uppercase">Digital Twin</label>
        <button 
          onClick={onConnect}
          disabled={isSerialConnected}
          className={`flex items-center gap-2 px-4 py-2 border transition-all duration-300
            ${isSerialConnected 
                ? 'bg-green-900/40 border-green-500 text-green-400 shadow-[0_0_15px_rgba(0,255,0,0.3)] cursor-default' 
                : 'bg-gray-900/40 border-gray-600 text-gray-400 hover:text-white hover:border-white'
            }`}
        >
          {isSerialConnected ? <Link size={18} /> : <Usb size={18} />}
          <span className="font-bold">{isSerialConnected ? 'LINKED' : 'CONNECT HARDWARE'}</span>
        </button>
      </div>

      {/* 2. Simulation Mode Switcher */}
      <div className="flex flex-col gap-2 border-r border-cyan-900/50 pr-6">
        <label className="text-xs tracking-widest text-cyan-500 font-bold uppercase">Logic Mode</label>
        <button 
          onClick={onTactileModeToggle}
          className={`flex items-center gap-2 px-4 py-2 border transition-all duration-300
            ${isTactileMode 
                ? 'bg-orange-900/40 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(255,165,0,0.3)]' 
                : 'bg-cyan-900/40 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
            }`}
        >
          {isTactileMode ? <Zap size={18} /> : <ShieldCheck size={18} />}
          <span className="font-bold">{isTactileMode ? 'AND GATE INTERLOCK' : 'LOGIC SAFETY'}</span>
        </button>
      </div>

      {/* 3. Master Power */}
      <div className="flex flex-col gap-2">
        <label className="text-xs tracking-widest text-gray-500 font-bold uppercase">Power</label>
        <button 
          onClick={onPowerToggle}
          className={`flex items-center gap-2 px-4 py-2 border ${power ? 'bg-gray-800 border-gray-600 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-600'} transition-all`}
        >
          <Power size={18} />
          <span>{power ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* 4. Servo Angle (Main Control) */}
      <div className="flex flex-col gap-2 flex-grow max-w-md">
        <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
          <span className={isTactileMode ? "text-orange-500" : "text-cyan-500"}>
             {isSerialConnected ? 'HARDWARE CONTROL' : 'MANUAL CONTROL'}
          </span>
          <span className="text-white">{servoAngle.toFixed(1)}°</span>
        </div>
        <div className="relative h-6 flex items-center">
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.1"
              value={servoAngle}
              onChange={(e) => onAngleChange(parseFloat(e.target.value))}
              disabled={!power || isCritical || isRebooting || isSerialConnected}
              className={`w-full h-2 bg-gray-900 appearance-none border border-gray-700 rounded-sm
                ${isSerialConnected ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_white]
                disabled:opacity-50`}
            />
            {/* Visual Indicator */}
            <div 
                className={`absolute top-1/2 -translate-y-1/2 h-1 pointer-events-none ${isTactileMode ? 'bg-orange-500' : 'bg-cyan-500'}`} 
                style={{ width: `${servoAngle}%`, left: 0 }}
            ></div>
        </div>
      </div>

      {/* 5. Variable Controls based on Mode */}
      {isTactileMode ? (
          // AND GATE LOGIC: User has ONE control (Master Permissive)
          // Sensors are displayed but not controlled directly here (Automation visualized)
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 items-center">
             
             {/* AUTOMATED SENSOR STATUS (Read Only) */}
             <div className="flex flex-col gap-1 w-32 opacity-80 pointer-events-none">
                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <span>SENSORS (AUTO)</span>
                </div>
                {/* Heat Bar */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-orange-500 w-6">HEAT</span>
                    <div className="flex-grow h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-300 ${heat > 80 ? 'bg-red-500' : 'bg-orange-500'}`}
                            style={{ width: `${Math.min(100, (heat/120)*100)}%` }}
                        ></div>
                    </div>
                </div>
                {/* Vib Bar */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-purple-500 w-6">VIB</span>
                    <div className="flex-grow h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-300 ${vibration > 80 ? 'bg-red-500' : 'bg-purple-500'}`}
                            style={{ width: `${Math.min(100, vibration)}%` }}
                        ></div>
                    </div>
                </div>
             </div>

             {/* THE ONE CONTROL: MASTER PERMISSIVE */}
             <button
                onClick={onPermissiveToggle}
                className={`flex flex-col items-center justify-center w-32 h-12 border rounded transition-all duration-200
                    ${manualPermissive 
                        ? 'bg-green-900/30 border-green-500 text-green-400 shadow-[0_0_15px_rgba(0,255,0,0.2)]' 
                        : 'bg-gray-900 border-gray-600 text-gray-500 hover:border-gray-400'
                    }`}
             >
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase mb-0.5">OPERATOR</span>
                <span className="text-sm font-black tracking-wider">{manualPermissive ? 'ENABLED' : 'DISABLED'}</span>
             </button>

          </div>
      ) : (
          // STANDARD MODE: Show Threshold Slider
          <div className="flex flex-col gap-2 flex-grow max-w-xs animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between text-xs text-cyan-500 font-bold uppercase tracking-widest">
              <span>Safety Threshold</span>
              <span>{safetyThreshold.toFixed(1)}°</span>
            </div>
            <div className="relative h-6 flex items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={safetyThreshold}
                  onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-900 appearance-none cursor-pointer border border-gray-700 rounded-sm
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:shadow-[0_0_5px_yellow]
                    z-10 relative"
                />
                <div 
                    className="absolute top-1/2 -translate-y-1/2 h-1 bg-red-900/60 pointer-events-none right-0" 
                    style={{ width: `${100 - safetyThreshold}%` }}
                ></div>
            </div>
          </div>
      )}

      {/* 6. Reboot / Visuals */}
      <div className="flex flex-col gap-2">
         <label className="text-xs tracking-widest text-gray-500 font-bold uppercase">System</label>
         <div className="flex gap-2">
             <button 
                onClick={onViewModeToggle}
                className="px-3 py-2 border bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
                title="Toggle View Mode"
            >
                {viewMode === 'wireframe' ? <Eye size={18} /> : <Box size={18} />}
            </button>
            <button 
                onClick={onReboot}
                disabled={!isCritical}
                className={`flex items-center gap-2 px-4 py-2 border 
                    ${isCritical ? 'bg-red-900/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-black animate-pulse' : 'bg-gray-900/50 border-gray-800 text-gray-700 cursor-not-allowed'}`}
            >
                <RefreshCw size={18} className={isRebooting ? "animate-spin" : ""} />
            </button>
         </div>
      </div>

    </div>
  );
};