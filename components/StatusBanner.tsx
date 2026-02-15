import React from 'react';
import { SystemStatus } from '../types';

export const StatusBanner: React.FC<{ 
    status: SystemStatus; 
    isReflexActive: boolean;
    isTactileMode: boolean;
    heat?: number;
    vibration?: number;
    pressure?: number;
}> = ({ status, isReflexActive, isTactileMode, heat = 0, vibration = 0, pressure = 0 }) => {
  const isCritical = status === SystemStatus.CRITICAL;
  
  // Determine display properties based on state
  let borderColor = 'border-cyan-600';
  let bgColor = 'bg-cyan-900/20';
  let textColor = 'text-cyan-400';
  let shadow = 'shadow-[0_0_15px_rgba(0,240,255,0.2)]';
  let animate = '';
  let displayText = status;

  if (isCritical) {
    // Critical Failure
    borderColor = 'border-red-600';
    bgColor = 'bg-red-900/40';
    textColor = 'text-red-500';
    shadow = 'shadow-[0_0_30px_rgba(255,0,0,0.4)]';
    animate = 'animate-pulse';

    // Override text for specific sensors if in Multi-Sensor Mode
    if (isTactileMode) {
        if (heat > 80) displayText = 'CRITICAL: OVERHEATING' as any;
        else if (vibration > 80) displayText = 'CRITICAL: UNSTABLE VIBRATION' as any;
        else if (pressure > 95) displayText = 'CRITICAL: COLLISION DETECTED' as any;
        else displayText = 'MULTI-SENSOR TRIP ACTIVATED' as any;
    }

  } else if (isTactileMode) {
     // Passive Multi-Sensor Mode
     borderColor = 'border-orange-600/50';
     bgColor = 'bg-orange-900/10';
     textColor = 'text-orange-400';
     shadow = 'shadow-[0_0_15px_rgba(255,165,0,0.1)]';
     displayText = 'MULTI-SENSOR MONITORING ACTIVE' as any;
  }
  
  return (
    <div className={`
      relative border-2 px-8 py-2 text-center uppercase tracking-[0.2em] font-bold text-xl backdrop-blur-sm transition-all duration-300
      ${borderColor} ${bgColor} ${textColor} ${shadow} ${animate}
    `}>
      {/* Decorative corners */}
      <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${borderColor.replace('border-', 'border-')}`}></div>
      <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 ${borderColor.replace('border-', 'border-')}`}></div>
      <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 ${borderColor.replace('border-', 'border-')}`}></div>
      <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${borderColor.replace('border-', 'border-')}`}></div>
      
      {displayText}
    </div>
  );
};
