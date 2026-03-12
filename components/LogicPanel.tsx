import React from 'react';
import { SystemStatus, GestureMode } from '../types';

export const LogicPanel: React.FC<{ 
  power: boolean; 
  status: SystemStatus; 
  gestureMode: GestureMode;
  gestureConfidence: number;
  isTactileMode?: boolean; 
  heat?: number; 
  vibration?: number; 
  pressure?: number; 
  manualPermissive?: boolean 
}> = ({ power, status, gestureMode, gestureConfidence, isTactileMode, heat = 0, vibration = 0, pressure = 0, manualPermissive = false }) => {
  const isNominal = status === SystemStatus.NOMINAL;
  const isCritical = status === SystemStatus.CRITICAL || status === SystemStatus.GESTURE_LOSS;
  
  const activeColor = '#00f0ff';
  const dimColor = '#1a2a3a';
  const safeColor = '#00ff66';
  const faultColor = '#ff003c';

  // Sensor Status Overhaul
  const isPowerActive = power;
  const isThresholdSafe = status !== SystemStatus.CRITICAL;
  const isGestureSafe = gestureMode !== 'LIVE' || gestureConfidence >= 0.7;
  const isPermissiveActive = manualPermissive;
  const isSystemArmed = isPowerActive && isThresholdSafe && isPermissiveActive;

  return (
    <div className="w-[420px] h-[240px] bg-black/60 border border-cyan-500/30 backdrop-blur-xl p-4 relative overflow-hidden group shadow-[0_0_30px_rgba(0,240,255,0.1)] rounded-sm">
      
      {/* Header */}
      <div className="absolute top-3 left-4 right-4 flex justify-between items-center border-b border-cyan-900/50 pb-2 z-10">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500">
           {isTactileMode ? 'INDUSTRIAL INTERLOCK' : 'SAFETY LOGIC CORE'}
        </div>
        <div className="flex gap-2">
            <div className={`w-2 h-2 rounded-full ${isNominal ? 'bg-green-500 shadow-[0_0_5px_#0f0]' : 'bg-gray-700'}`}></div>
            <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500 shadow-[0_0_5px_#f00] animate-pulse' : 'bg-gray-700'}`}></div>
        </div>
      </div>

      <div className="relative w-full h-full pt-6">
        <svg width="100%" height="100%" viewBox="0 0 400 200" className="drop-shadow-[0_0_5px_rgba(0,240,255,0.2)]">
          <defs>
             <marker id="arrow-small" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
               <path d="M0,0 L4,2 L0,4 L0,0" fill={isNominal ? activeColor : dimColor} />
             </marker>
          </defs>

          {isTactileMode ? (
            <>
               {/* INPUT A: POWER STATUS */}
               <text x="10" y="45" fill={isPowerActive ? safeColor : dimColor} fontSize="10" fontFamily="monospace" fontWeight="bold">PWR_READY</text>
               <path d="M70,40 L180,40 L200,80" fill="none" stroke={isPowerActive ? safeColor : dimColor} strokeWidth="2" />

               {/* INPUT B: THRESHOLD INTERLOCK */}
               <text x="10" y="95" fill={isThresholdSafe ? safeColor : faultColor} fontSize="10" fontFamily="monospace" fontWeight="bold">ANG_LIMIT</text>
               <path d="M70,90 L200,90" fill="none" stroke={isThresholdSafe ? safeColor : faultColor} strokeWidth="2" />

               {/* INPUT C: OPERATOR PERMISSIVE */}
               <text x="10" y="145" fill={isPermissiveActive ? safeColor : dimColor} fontSize="10" fontFamily="monospace" fontWeight="bold">OPER_EN</text>
               <path d="M70,140 L180,140 L200,100" fill="none" stroke={isPermissiveActive ? safeColor : dimColor} strokeWidth="2" />

               {/* 3-INPUT AND GATE SYMBOL */}
               <path d="M200,50 L200,130 Q280,130 280,90 Q280,50 200,50 Z" fill={isSystemArmed ? activeColor : 'none'} fillOpacity="0.1" stroke={activeColor} strokeWidth="2" />
               <text x="215" y="95" fill={activeColor} fontSize="12" fontWeight="bold">AND_PRO</text>

               {/* OUTPUT: SYSTEM ACTIVE */}
               <path d="M280,90 L340,90" fill="none" stroke={isSystemArmed ? safeColor : dimColor} strokeWidth="4" markerEnd="url(#arrow-small)" />
               <text x="350" y="95" fill={isSystemArmed ? safeColor : dimColor} fontSize="12" fontWeight="bold">{isSystemArmed ? 'ARMED' : 'SAFE'}</text>

               {/* ANIMATIONS */}
               {isSystemArmed && (
                 <>
                   <circle r="3" fill={safeColor}><animateMotion dur="1s" repeatCount="indefinite" path="M70,40 L180,40 L200,80" /></circle>
                   <circle r="3" fill={safeColor}><animateMotion dur="1.2s" repeatCount="indefinite" path="M70,90 L200,90" /></circle>
                   <circle r="3" fill={safeColor}><animateMotion dur="0.8s" repeatCount="indefinite" path="M70,140 L180,140 L200,100" /></circle>
                   <circle r="4" fill="#fff"><animateMotion dur="0.5s" repeatCount="indefinite" path="M280,90 L340,90" /></circle>
                 </>
               )}
            </>
          ) : (
            <>
              <text x="10" y="55" fill={power ? activeColor : dimColor} fontSize="10" fontFamily="monospace">J1_SIG</text>
              <path id="j1-path" d="M50,50 L100,50 L110,70 L130,70" fill="none" stroke={power ? activeColor : dimColor} strokeWidth="2" />
              <path id="limit-path" d="M50,90 L100,90 L110,90 L130,90" fill="none" stroke={power ? safeColor : dimColor} strokeWidth="2" strokeDasharray="4 2"/>
              <path id="enable-path" d="M60,140 L150,140 L180,110 L220,110" fill="none" stroke={power ? activeColor : dimColor} strokeWidth="2" />
              
              {/* Animated Pulses */}
              {power && !isCritical && (
                <>
                  <circle r="2" fill={activeColor}>
                    <animateMotion dur="1.5s" repeatCount="indefinite">
                      <mpath href="#j1-path" />
                    </animateMotion>
                  </circle>
                  <circle r="2" fill={safeColor}>
                    <animateMotion dur="2s" repeatCount="indefinite">
                      <mpath href="#limit-path" />
                    </animateMotion>
                  </circle>
                  <circle r="2" fill={activeColor}>
                    <animateMotion dur="1.8s" repeatCount="indefinite">
                      <mpath href="#enable-path" />
                    </animateMotion>
                  </circle>
                </>
              )}

              <path d="M130,60 L130,100 L170,80 Z" fill="none" stroke={activeColor} strokeWidth="2" fillOpacity="0.1" />
              <text x="135" y="83" fill={activeColor} fontSize="8" fontWeight="bold">&gt;</text>
              <path d="M170,80 L200,80" fill="none" stroke={isCritical ? '#ff003c' : dimColor} strokeWidth="2" />
              <text x="10" y="145" fill={power ? activeColor : dimColor} fontSize="10" fontFamily="monospace">SYS_ENABLE</text>
              
              <circle cx="210" cy="80" r="4" stroke={isCritical ? '#ff003c' : dimColor} fill="none" />
              <path d="M220,70 L220,130 Q270,130 270,100 Q270,70 220,70 Z" fill={isNominal && power ? activeColor : 'none'} fillOpacity="0.1" stroke={activeColor} strokeWidth="2" />
              <text x="230" y="105" fill={activeColor} fontSize="12" fontWeight="bold">AND</text>
              <path id="out-path" d="M270,100 L350,100" fill="none" stroke={isNominal && power ? activeColor : dimColor} strokeWidth="4" markerEnd="url(#arrow-small)" />

              {isNominal && power && (
                <circle r="3" fill="#fff">
                  <animateMotion dur="0.8s" repeatCount="indefinite">
                    <mpath href="#out-path" />
                  </animateMotion>
                </circle>
              )}
            </>
          )}
        </svg>
      </div>

      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(${activeColor} 1px, transparent 1px), linear-gradient(90deg, ${activeColor} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}></div>
    </div>
  );
};
