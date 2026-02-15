import React from 'react';
import { SystemStatus } from '../types';

export const LogicPanel: React.FC<{ power: boolean; status: SystemStatus; isTactileMode?: boolean; heat?: number; vibration?: number; pressure?: number; manualPermissive?: boolean }> = ({ power, status, isTactileMode, heat = 0, vibration = 0, pressure = 0, manualPermissive = false }) => {
  const isNominal = status === SystemStatus.NOMINAL;
  const isCritical = status === SystemStatus.CRITICAL;
  
  const activeColor = '#00f0ff';
  const dimColor = '#1a2a3a';
  const safeColor = '#00ff66';
  const faultColor = '#ff003c';

  // Sensor Status
  const isHeatSafe = heat <= 80;
  const isVibSafe = vibration <= 80;
  const isProxSafe = pressure <= 95;
  const areSensorsSafe = isHeatSafe && isVibSafe && isProxSafe;

  return (
    // Increased size: w-[420px] h-[240px]
    <div className="w-[420px] h-[240px] bg-black/60 border border-cyan-500/30 backdrop-blur-xl p-4 relative overflow-hidden group shadow-[0_0_30px_rgba(0,240,255,0.1)] rounded-sm">
      
      {/* Header */}
      <div className="absolute top-3 left-4 right-4 flex justify-between items-center border-b border-cyan-900/50 pb-2 z-10">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500">
           {isTactileMode ? 'AND GATE INTERLOCK' : 'SAFETY LOGIC CORE'}
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
            // =========================
            // AND GATE VISUALIZATION (INTERLOCK)
            // =========================
            <>
               {/* INPUT A: SENSOR ARRAY (Aggregated) */}
               <text x="10" y="65" fill={areSensorsSafe ? safeColor : faultColor} fontSize="10" fontFamily="monospace" fontWeight="bold">
                   SENSORS: {areSensorsSafe ? 'READY' : 'FAULT'}
               </text>
               {/* Trace A */}
               <path d="M100,60 L180,60 L200,80" fill="none" stroke={areSensorsSafe ? safeColor : faultColor} strokeWidth="3" />

               {/* INPUT B: MANUAL PERMISSIVE */}
               <text x="10" y="125" fill={manualPermissive ? safeColor : dimColor} fontSize="10" fontFamily="monospace" fontWeight="bold">
                   OPERATOR: {manualPermissive ? 'ENABLE' : 'OFF'}
               </text>
               {/* Trace B */}
               <path d="M100,120 L180,120 L200,100" fill="none" stroke={manualPermissive ? safeColor : dimColor} strokeWidth="3" />

               {/* AND GATE SYMBOL */}
               {/* D-Shape Body */}
               <path d="M200,50 L200,130 Q260,130 260,90 Q260,50 200,50 Z" 
                     fill={isNominal ? activeColor : 'none'} fillOpacity="0.1"
                     stroke={activeColor} strokeWidth="2" />
               
               <text x="210" y="95" fill={activeColor} fontSize="12" fontWeight="bold">AND</text>

               {/* OUTPUT: SYSTEM ACTIVE */}
               <path d="M260,90 L320,90" fill="none" stroke={isNominal ? safeColor : dimColor} strokeWidth="4" markerEnd="url(#arrow-small)" />
               <text x="330" y="95" fill={isNominal ? safeColor : dimColor} fontSize="12" fontWeight="bold">
                   {isNominal ? 'ACTIVE' : 'LOCKED'}
               </text>

               {/* ANIMATIONS */}
               {/* Flow A (Sensors) */}
               {areSensorsSafe && <circle r="4" fill={safeColor}><animateMotion dur="1s" repeatCount="indefinite" path="M100,60 L180,60 L200,80" /></circle>}
               
               {/* Flow B (Operator) */}
               {manualPermissive && <circle r="4" fill={safeColor}><animateMotion dur="1s" repeatCount="indefinite" path="M100,120 L180,120 L200,100" /></circle>}

               {/* Output Flow */}
               {isNominal && <circle r="5" fill="#fff"><animateMotion dur="0.5s" repeatCount="indefinite" path="M260,90 L330,90" /></circle>}
            </>
          ) : (
            // =========================
            // STANDARD AND/NOT LOGIC (Existing)
            // =========================
            <>
              {/* INPUT 1: Servo Angle Signal */}
              <text x="10" y="55" fill={power ? activeColor : dimColor} fontSize="10" fontFamily="monospace">ANGLE_IN</text>
              <path d="M60,50 L100,50 L110,70 L130,70" fill="none" stroke={power ? activeColor : dimColor} strokeWidth="2" />

              {/* INPUT 2: Threshold Signal */}
              <text x="10" y="95" fill={power ? safeColor : dimColor} fontSize="10" fontFamily="monospace">LIMIT_REF</text>
              <path d="M60,90 L100,90 L110,90 L130,90" fill="none" stroke={power ? safeColor : dimColor} strokeWidth="2" strokeDasharray="4 2"/>

              {/* COMPONENT: COMPARATOR (Triangle) */}
              <path d="M130,60 L130,100 L170,80 Z" fill="none" stroke={activeColor} strokeWidth="2" fillOpacity="0.1" />
              <text x="135" y="83" fill={activeColor} fontSize="8" fontWeight="bold">&gt;</text>
              
              {/* Comparator Output Trace (Fault Signal) */}
              {/* If Critical, this line lights up RED */}
              <path d="M170,80 L200,80" fill="none" stroke={isCritical ? '#ff003c' : dimColor} strokeWidth="2" />
              
              {/* INPUT 3: Master Enable */}
              <text x="10" y="145" fill={power ? activeColor : dimColor} fontSize="10" fontFamily="monospace">SYS_ENABLE</text>
              <path d="M60,140 L150,140 L180,110 L220,110" fill="none" stroke={power ? activeColor : dimColor} strokeWidth="2" />

              {/* COMPONENT: NOT GATE (Inverter for Fault) */}
              <circle cx="210" cy="80" r="4" stroke={isCritical ? '#ff003c' : dimColor} fill="none" />
              <path d="M214,80 L220,80 L220,90" fill="none" stroke={isCritical ? '#ff003c' : dimColor} strokeWidth="2" />

              {/* COMPONENT: AND GATE (D-Shape) */}
              <path d="M220,70 L220,130 Q270,130 270,100 Q270,70 220,70 Z" 
                    fill={isNominal && power ? activeColor : 'none'} 
                    fillOpacity="0.1" 
                    stroke={activeColor} 
                    strokeWidth="2" 
              />
              <text x="230" y="105" fill={activeColor} fontSize="12" fontWeight="bold">AND</text>

              {/* OUTPUT: Motor Power */}
              <path d="M270,100 L350,100" fill="none" stroke={isNominal && power ? activeColor : dimColor} strokeWidth="4" markerEnd="url(#arrow-small)" />
              <text x="310" y="90" fill={isNominal && power ? activeColor : dimColor} fontSize="10" fontFamily="monospace">MOTOR_DRIVE</text>

              {/* --- ANIMATIONS --- */}
              {power && (
                <>
                    {/* Data Flow entering */}
                    <circle r="3" fill="#fff">
                        <animateMotion dur="2s" repeatCount="indefinite" path="M60,50 L100,50 L110,70 L130,70" />
                    </circle>

                    {/* System Enable Flow */}
                    <circle r="3" fill="#fff">
                        <animateMotion dur="2s" repeatCount="indefinite" path="M60,140 L150,140 L180,110 L220,110" />
                    </circle>

                    {/* Output Flow (Only if Nominal) */}
                    {isNominal && (
                        <circle r="4" fill="#fff" filter="url(#glow)">
                            <animateMotion dur="1s" repeatCount="indefinite" path="M270,100 L360,100" />
                        </circle>
                    )}

                    {/* Critical Fault Flow (Only if Critical) */}
                    {isCritical && (
                        <circle r="3" fill="#ff003c">
                            <animateMotion dur="0.5s" repeatCount="indefinite" path="M170,80 L210,80" />
                        </circle>
                    )}
                </>
              )}
            </>
          )}

        </svg>
      </div>

      {/* Decorative Grid Background */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: `linear-gradient(${activeColor} 1px, transparent 1px), linear-gradient(90deg, ${activeColor} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}>
      </div>
    </div>
  );
};
