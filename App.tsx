import React, { useState, useEffect } from 'react';
import { SystemStatus, SystemState } from './types';
import { Viewport3D } from './components/Viewport3D';
import { Controls } from './components/Controls';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { LogicPanel } from './components/LogicPanel';
import { StatusBanner } from './components/StatusBanner';
import { LandingPage } from './components/LandingPage';
import { MAX_HISTORY_LENGTH } from './constants';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [state, setState] = useState<SystemState>({
    power: true,
    servoAngle: 0,
    safetyThreshold: 80,
    objectPosition: 75, // Default object position
    pressure: 0,
    status: SystemStatus.NOMINAL,
    torqueHistory: Array(MAX_HISTORY_LENGTH).fill({ time: 0, value: 0 }),
    viewMode: 'wireframe',
    isTactileMode: false // Start in Standard Mode
  });

  // Simulation Loop
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      setState(prev => {
        if (!prev.power) return prev;
        if (prev.status === SystemStatus.REBOOTING) return prev;

        let newStatus = prev.status;
        let newAngle = prev.servoAngle;
        let newPressure = prev.pressure;
        
        // ==========================================
        // MODE 1: TACTILE SENSOR MODE (Reflex System)
        // ==========================================
        if (prev.isTactileMode) {
            // Logic: Ignore Safety Threshold slider. Focus ONLY on Physical Collision with Object.
            const collisionAngle = prev.objectPosition;

            // Check Collision with physical object
            if (newAngle >= collisionAngle) {
                newPressure = 100; // Spike pressure
                newAngle = collisionAngle; // Clamp physically to obstacle surface
            } else if (prev.pressure > 0 && newAngle < collisionAngle) {
                // Decay pressure more slowly to show the effect
                newPressure = Math.max(0, prev.pressure - 5); 
            }

            // REFLEX ACTION: If pressure is high, RETRACT AUTOMATICALLY
            // We use a threshold of 20 to ensure it clears the object
            if (newPressure > 20) {
                 // Smooth recoil: Move away from object
                 const recoilTarget = Math.max(0, collisionAngle - 15);
                 // Move towards recoil target
                 if (newAngle > recoilTarget) {
                     newAngle = Math.max(recoilTarget, newAngle - 5);
                 }
            }

        // ==========================================
        // MODE 2: STANDARD SAFETY MODE (Interlock System)
        // ==========================================
        } else {
            newPressure = 0; // No pressure sensor in this mode
            
            // Logic: Compare Angle vs Threshold Slider
            if (prev.status === SystemStatus.NOMINAL && prev.servoAngle > prev.safetyThreshold) {
                newStatus = SystemStatus.CRITICAL; // Lock system
            }
        }

        // Update History
        const sensorReading = newAngle + (Math.random() - 0.5) * 0.5;
        const newHistory = [...prev.torqueHistory, { time: Date.now(), value: sensorReading }];
        if (newHistory.length > MAX_HISTORY_LENGTH) newHistory.shift();

        return {
          ...prev,
          status: newStatus,
          servoAngle: newAngle,
          pressure: newPressure,
          torqueHistory: newHistory
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleReboot = () => {
    setState(prev => ({ ...prev, status: SystemStatus.REBOOTING }));
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        status: SystemStatus.NOMINAL,
        servoAngle: 0,
        pressure: 0,
        torqueHistory: Array(MAX_HISTORY_LENGTH).fill({ time: 0, value: 0 })
      }));
    }, 2000);
  };

  const handlePowerToggle = () => {
    setState(prev => ({ ...prev, power: !prev.power, status: !prev.power ? SystemStatus.NOMINAL : prev.status }));
  };

  const handleAngleChange = (val: number) => {
    if (state.status === SystemStatus.CRITICAL || !state.power || state.status === SystemStatus.REBOOTING) return;
    
    // In Tactile Mode, if reflex is active, prevent manual override forward
    if (state.isTactileMode && state.pressure > 20 && val > state.servoAngle) return;

    let targetAngle = val;

    // IMMEDIATE CLAMP: In Tactile Mode, the arm physically cannot exceed the obstacle.
    if (state.isTactileMode && targetAngle > state.objectPosition) {
        targetAngle = state.objectPosition;
    }

    setState(prev => ({ ...prev, servoAngle: targetAngle }));
  };

  const handleThresholdChange = (val: number) => {
    setState(prev => ({ ...prev, safetyThreshold: val }));
  };
  
  const handleObjectPositionChange = (val: number) => {
      // When moving the object, if we move it INTO the arm, push the arm back immediately
      setState(prev => {
          let adjustedServoAngle = prev.servoAngle;
          if (prev.isTactileMode && prev.servoAngle > val) {
              adjustedServoAngle = val;
          }
          return { 
              ...prev, 
              objectPosition: val,
              servoAngle: adjustedServoAngle
          };
      });
  };

  const handleViewModeToggle = () => {
    setState(prev => ({ ...prev, viewMode: prev.viewMode === 'wireframe' ? 'realistic' : 'wireframe' }));
  };

  const handleTactileModeToggle = () => {
      setState(prev => ({ 
          ...prev, 
          isTactileMode: !prev.isTactileMode,
          servoAngle: 0,
          status: SystemStatus.NOMINAL,
          pressure: 0,
          objectPosition: 75 // Reset object to default position on toggle
      }));
  };

  if (!isLoggedIn) {
    return <LandingPage onLogin={() => setIsLoggedIn(true)} />;
  }

  const isReflexActive = state.isTactileMode && state.pressure > 20;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden scanlines text-cyan-400 select-none">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-black to-black"></div>

      {/* 3D Viewport Layer */}
      <div className="absolute inset-0 z-10">
        <Viewport3D 
          angle={state.servoAngle} 
          status={state.status} 
          power={state.power} 
          viewMode={state.viewMode}
          pressure={state.pressure}
          isTactileMode={state.isTactileMode}
          objectPosition={state.objectPosition}
        />
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Top Section */}
        <div className="flex justify-between items-start w-full">
          <div className="pointer-events-auto">
            {/* Logic Panel changes based on mode */}
            <LogicPanel power={state.power} status={state.status} />
          </div>
          
          <div className="pointer-events-auto">
             <StatusBanner status={state.status} isReflexActive={isReflexActive} isTactileMode={state.isTactileMode} />
          </div>

          <div className="pointer-events-auto">
            <AnalyticsPanel 
                data={state.torqueHistory} 
                status={state.status} 
                threshold={state.isTactileMode ? state.objectPosition : state.safetyThreshold}
                isTactileMode={state.isTactileMode}
            />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pointer-events-auto mt-auto">
          <Controls 
            power={state.power}
            servoAngle={state.servoAngle}
            safetyThreshold={state.safetyThreshold}
            objectPosition={state.objectPosition}
            pressure={state.pressure}
            status={state.status}
            viewMode={state.viewMode}
            isTactileMode={state.isTactileMode}
            onPowerToggle={handlePowerToggle}
            onAngleChange={handleAngleChange}
            onThresholdChange={handleThresholdChange}
            onObjectPositionChange={handleObjectPositionChange}
            onReboot={handleReboot}
            onViewModeToggle={handleViewModeToggle}
            onTactileModeToggle={handleTactileModeToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
