import React, { useState, useEffect, useRef } from 'react';
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
    heat: 30, // Normal operating temp
    vibration: 10, // Normal vibration
    manualHeat: 50, // User Setpoint for Automation
    manualVibration: 30, // User Setpoint for Automation
    status: SystemStatus.NOMINAL,
    torqueHistory: Array(MAX_HISTORY_LENGTH).fill({ time: 0, value: 0 }),
    viewMode: 'wireframe',
    isTactileMode: false, // Start in Standard Mode
    isSerialConnected: false
  });

  // Refs for Web Serial to persist across renders without triggering them
  const serialPortRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);

  // ==========================================
  // WEB SERIAL API INTEGRATION
  // ==========================================
  
  // Handle physical disconnection events
  useEffect(() => {
    const handleDisconnect = () => {
        console.log("Hardware disconnected");
        setState(prev => ({ ...prev, isSerialConnected: false }));
        writerRef.current = null;
        serialPortRef.current = null;
    };

    if ((navigator as any).serial) {
        (navigator as any).serial.addEventListener('disconnect', handleDisconnect);
    }
    return () => {
        if ((navigator as any).serial) {
            (navigator as any).serial.removeEventListener('disconnect', handleDisconnect);
        }
    };
  }, []);

  const connectSerial = async () => {
    // Cast navigator to any to avoid TypeScript errors with experimental Web Serial API
    if (!(navigator as any).serial) {
        alert("Web Serial API not supported in this browser. Try Chrome or Edge.");
        return;
    }

    try {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        serialPortRef.current = port;

        // Setup Writer
        const textEncoder = new TextEncoderStream();
        const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
        const writer = textEncoder.writable.getWriter();
        writerRef.current = writer;

        setState(prev => ({ ...prev, isSerialConnected: true }));

        // Start Reading Loop
        readLoop(port);

    } catch (err) {
        console.error("Error connecting to serial port:", err);
    }
  };

  const readLoop = async (port: any) => {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      let buffer = "";

      try {
          while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              
              buffer += value;
              const lines = buffer.split('\n');
              buffer = lines.pop() || ""; // Keep incomplete line in buffer

              for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed) {
                      const sensorValue = parseInt(trimmed, 10);
                      if (!isNaN(sensorValue)) {
                          // Map Input (Approx 600-900) to Servo Angle (0-100)
                          // We use a flexible mapping and clamp it
                          const minInput = 600;
                          const maxInput = 900;
                          let mappedAngle = ((sensorValue - minInput) / (maxInput - minInput)) * 100;
                          mappedAngle = Math.max(0, Math.min(100, mappedAngle));

                          setState(prev => {
                              // If reflex is active in tactile mode, hardware input is momentarily ignored
                              if (prev.isTactileMode && prev.pressure > 20) return prev;
                              
                              // Tactile Mode Collision Physics Clamp
                              if (prev.isTactileMode && mappedAngle > prev.objectPosition) {
                                  mappedAngle = prev.objectPosition;
                              }

                              return { ...prev, servoAngle: mappedAngle };
                          });
                      }
                  }
              }
          }
      } catch (error) {
          console.error("Read error or disconnect:", error);
          setState(prev => ({ ...prev, isSerialConnected: false }));
      } finally {
          reader.releaseLock();
      }
  };

  // ==========================================
  // SIMULATION LOOP
  // ==========================================
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      setState(prev => {
        if (!prev.power) return prev;
        if (prev.status === SystemStatus.REBOOTING) return prev;

        let newStatus = prev.status;
        let newAngle = prev.servoAngle;
        let newPressure = prev.pressure;
        let signalChar = 'N'; // Nominal by default
        
        // ==========================================
        // MODE 1: MULTI-SENSOR TRIP (OR Gate Logic) - AUTOMATED
        // ==========================================
        if (prev.isTactileMode) {
            // 1. Simulate Automated Sensor Fluctuations (Sine Waves + Noise)
            // Based on User Manual Setpoint
            const time = Date.now() / 1000; // Seconds
            const baseHeat = prev.manualHeat ?? 50;
            const baseVib = prev.manualVibration ?? 30;
            
            // Heat: User Setpoint + Sine Wave + Noise
            let autoHeat = baseHeat + (Math.sin(time * 0.5) * 10) + ((Math.random() - 0.5) * 5);
            
            // Vibration: User Setpoint + Sine Wave + Noise
            let autoVib = baseVib + (Math.sin(time * 2) * 15) + ((Math.random() - 0.5) * 10);
            
            // Clamp values
            autoHeat = Math.max(0, Math.min(120, autoHeat));
            autoVib = Math.max(0, Math.min(100, autoVib));

            // 2. Proximity Logic (Simple Distance, No Collision Wall)
            const collisionAngle = prev.objectPosition;
            let proximityValue = 0; 
            
            // Just a simple calculation, no hard stop or "wall" logic needed for visualization
            if (newAngle > collisionAngle - 20) {
                proximityValue = ((newAngle - (collisionAngle - 20)) / 20) * 100;
            }
            
            // 3. AND GATE INTERLOCK LOGIC: 
            // ACTIVE ONLY IF (Sensors Safe) AND (Manual Permissive ON)
            const HEAT_LIMIT = 80;
            const VIB_LIMIT = 80;
            const PROX_LIMIT = 95;

            const isHeatSafe = autoHeat <= HEAT_LIMIT;
            const isVibSafe = autoVib <= VIB_LIMIT;
            const isProxSafe = proximityValue <= PROX_LIMIT;
            
            const areSensorsSafe = isHeatSafe && isVibSafe && isProxSafe;
            const isPermissiveOn = prev.manualPermissive; // User Control

            if (!isPermissiveOn) {
                newStatus = SystemStatus.CRITICAL; // Standby/Locked
                signalChar = 'C';
            } else if (!areSensorsSafe) {
                newStatus = SystemStatus.CRITICAL; // Sensor Fault
                signalChar = 'C';
            } else {
                newStatus = SystemStatus.NOMINAL; // Active
                signalChar = 'N';
            }

            return {
                ...prev,
                status: newStatus,
                servoAngle: newAngle,
                pressure: proximityValue, 
                heat: autoHeat, // Update with automated values
                vibration: autoVib, // Update with automated values
                torqueHistory: [...prev.torqueHistory, { time: Date.now(), value: newAngle + (Math.random() * 0.5) }].slice(-MAX_HISTORY_LENGTH)
            };

        // ==========================================
        // MODE 2: STANDARD SAFETY MODE (Interlock System)
        // ==========================================
        } else {
            newPressure = 0; 
            
            // Logic: Compare Angle vs Threshold Slider
            if (prev.status === SystemStatus.NOMINAL && prev.servoAngle > prev.safetyThreshold) {
                newStatus = SystemStatus.CRITICAL; // Lock system
                signalChar = 'C'; // Signal Critical
            } else if (prev.status === SystemStatus.CRITICAL) {
                signalChar = 'C';
            }
        }

        // Update History
        const sensorReading = newAngle + (Math.random() - 0.5) * 0.5;
        const newHistory = [...prev.torqueHistory, { time: Date.now(), value: sensorReading }];
        if (newHistory.length > MAX_HISTORY_LENGTH) newHistory.shift();

        // WRITER: Send Feedback to Arduino
        // We do this inside the loop to ensure the physical twin matches the digital twin's safety state
        if (prev.isSerialConnected && writerRef.current) {
            writerRef.current.write(signalChar).catch(e => {
                // Silent catch, error will be handled by readLoop or event listener
            });
        }

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

    // IMMEDIATE CLAMP
    if (state.isTactileMode && targetAngle > state.objectPosition) {
        targetAngle = state.objectPosition;
    }

    setState(prev => ({ ...prev, servoAngle: targetAngle }));
  };

  const handleThresholdChange = (val: number) => {
    setState(prev => ({ ...prev, safetyThreshold: val }));
  };

  const handleHeatChange = (val: number) => {
    setState(prev => ({ ...prev, manualHeat: val }));
  };

  const handleVibrationChange = (val: number) => {
    setState(prev => ({ ...prev, manualVibration: val }));
  };
  
  const handlePermissiveToggle = () => {
    setState(prev => ({ ...prev, manualPermissive: !prev.manualPermissive }));
  };

  const handleObjectPositionChange = (val: number) => {
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
          objectPosition: 75 
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
            <LogicPanel 
              power={state.power} 
              status={state.status} 
              isTactileMode={state.isTactileMode}
              manualPermissive={state.manualPermissive}
            heat={state.heat}
            vibration={state.vibration}
            pressure={state.pressure}
            />
          </div>
          
          <div className="pointer-events-auto">
             <StatusBanner 
                status={state.status} 
                isReflexActive={isReflexActive} 
                isTactileMode={state.isTactileMode} 
                heat={state.heat}
                vibration={state.vibration}
                pressure={state.pressure}
             />
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
            heat={state.heat}
            vibration={state.vibration}
            manualHeat={state.manualHeat}
            manualVibration={state.manualVibration}
            manualPermissive={state.manualPermissive}
            status={state.status}
            viewMode={state.viewMode}
            isTactileMode={state.isTactileMode}
            isSerialConnected={state.isSerialConnected}
            onPowerToggle={handlePowerToggle}
            onAngleChange={handleAngleChange}
            onThresholdChange={handleThresholdChange}
            onObjectPositionChange={handleObjectPositionChange}
            onHeatChange={handleHeatChange}
            onVibrationChange={handleVibrationChange}
            onPermissiveToggle={handlePermissiveToggle}
            onReboot={handleReboot}
            onViewModeToggle={handleViewModeToggle}
            onTactileModeToggle={handleTactileModeToggle}
            onConnect={connectSerial}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
