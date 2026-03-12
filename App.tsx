import React, { useState, useEffect, useRef } from 'react';
import { SystemStatus, SystemState, ViewMode, JointState, GestureMode } from './types';
import { Viewport3D } from './components/Viewport3D';
import { Controls } from './components/Controls';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { LogicPanel } from './components/LogicPanel';
import { StatusBanner } from './components/StatusBanner';
import { LandingPage } from './components/LandingPage';
import { GestureMirrorSystem } from './components/GestureMirrorSystem';
import { useGestureMirror } from './hooks/useGestureMirror';
import { MAX_HISTORY_LENGTH } from './constants';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [state, setState] = useState<SystemState>({
    power: true,
    servoAngle: 0,
    joints: { j1: 90, j2: 90, j3: 90, j4: 0 },
    ghostJoints: { j1: 90, j2: 90, j3: 90, j4: 0 },
    safetyThreshold: 175, // Increased default headroom
    pressure: 0,
    heat: 30,
    vibration: 10,
    manualHeat: 50,
    manualVibration: 30,
    manualPermissive: false,
    status: SystemStatus.NOMINAL,
    viewMode: 'wireframe',
    isTactileMode: false,
    isSerialConnected: false,
    gestureMode: 'DISABLED',
    gestureConfidence: 0,
    isCalibrated: false,
    gestureSmoothing: 0.2, 
    isGestureFrozen: false
  });

  const [angleHistory, setAngleHistory] = useState<{ time: number; value: number }[]>(
    Array(MAX_HISTORY_LENGTH).fill({ time: 0, value: 0 })
  );

  // Initialize the new gesture mirror hook with jump prevention sync
  const { 
    videoRef, 
    canvasRef, 
    jointAngles, 
    isTracking, 
    confidence, 
    mode: mirrorMode, 
    setMode: setMirrorMode 
  } = useGestureMirror(state.joints);

  const serialPortRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const thresholdTimerRef = useRef<number | null>(null);

  // Sync state with gesture system
  useEffect(() => {
    if (mirrorMode !== 'DISABLED') {
      setState(prev => {
        // Persistent ALARM check: If any joint exceeds safetyThreshold, check persistence
        const jointValues = Object.values(jointAngles);
        const isExceeding = jointValues.some(v => v > state.safetyThreshold);
        
        if (isExceeding) {
           if (!thresholdTimerRef.current) {
             thresholdTimerRef.current = Date.now();
           } else if (Date.now() - thresholdTimerRef.current > 500) {
             if (prev.status !== SystemStatus.CRITICAL) {
               return { ...prev, status: SystemStatus.CRITICAL };
             }
           }
        } else {
           thresholdTimerRef.current = null;
        }

        // If in critical state, do not update joints via gesture - require manual reset
        if (prev.status === SystemStatus.CRITICAL) {
          return { ...prev, gestureConfidence: confidence, gestureMode: mirrorMode };
        }

        const shouldOverride = mirrorMode === 'LIVE' && isTracking;
        const isMirroringActive = mirrorMode !== ('DISABLED' as GestureMode); 
        
        // Visual Warning Logic: Status is amber if close to threshold
        let currentStatus = prev.status;
        if (currentStatus === SystemStatus.NOMINAL && isExceeding) {
          // Temporarily show that we are in a warning zone (could be handled via UI colors)
        }

        return {
          ...prev,
          joints: shouldOverride ? jointAngles : prev.joints,
          ghostJoints: jointAngles,
          gestureConfidence: confidence,
          gestureMode: mirrorMode,
          status: (isTracking || !isMirroringActive) 
            ? (prev.status === SystemStatus.GESTURE_LOSS ? SystemStatus.NOMINAL : prev.status) 
            : SystemStatus.GESTURE_LOSS
        };
      });
    } else {
      setState(prev => ({ ...prev, gestureMode: 'DISABLED', gestureConfidence: 0 }));
    }
  }, [jointAngles, mirrorMode, confidence, isTracking]);

  // Dedicated Serial Transmitter (Handles both gesture and manual)
  useEffect(() => {
    if (state.isSerialConnected && writerRef.current) {
      const { j1, j2, j3, j4 } = state.joints;
      const payload = `${Math.round(j1)},${Math.round(j2)},${Math.round(j3)},${Math.round(j4)}\n`;
      writerRef.current.write(payload).catch(() => {});
    }
  }, [state.joints, state.isSerialConnected]);

  // Live Telemetry Sampler (For Analytics Graph) - Optimized to separate state
  useEffect(() => {
    const interval = setInterval(() => {
      // Access joints directly from the latest state reference if possible, 
      // but since we are in an interval, we'll use a functional update for history
      // We'll peek at the joints from the main state by using a ref if lag persists,
      // but for now, we'll just sample the current 'state' variable which might be slightly stale but safer for React
      const currentBending = Math.max(
        state.joints.j1,
        state.joints.j2,
        state.joints.j3,
        state.joints.j4
      );
      
      setAngleHistory(prevHistory => {
        return [...prevHistory, { 
          time: Date.now(), 
          value: currentBending 
        }].slice(-MAX_HISTORY_LENGTH);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [state.joints]); // Re-bind on joint change to keep sampler fresh

  // Serial Connection Logic
  const connectSerial = async () => {
    if (!(navigator as any).serial) {
      alert("Web Serial API not supported in this browser.");
      return;
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      serialPortRef.current = port;
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      writerRef.current = textEncoder.writable.getWriter();
      setState(prev => ({ ...prev, isSerialConnected: true }));
    } catch (err) {
      console.error("Connection failed", err);
    }
  };

  const handlePowerToggle = () => setState(prev => ({ ...prev, power: !prev.power }));
  const handleReboot = () => setState(prev => ({ ...prev, status: SystemStatus.NOMINAL }));
  const handleViewModeToggle = () => setState(prev => ({ ...prev, viewMode: prev.viewMode === 'wireframe' ? 'realistic' : 'wireframe' }));
  const handleTactileModeToggle = () => setState(prev => ({ ...prev, isTactileMode: !prev.isTactileMode }));
  const handlePermissiveToggle = () => setState(prev => ({ ...prev, manualPermissive: !prev.manualPermissive }));
  const handleThresholdChange = (val: number) => setState(prev => ({ ...prev, safetyThreshold: val }));

  const handleJointChange = (joint: keyof JointState, val: number) => {
    setState(prev => ({
      ...prev,
      joints: { ...prev.joints, [joint]: val }
    }));
  };

  if (!isLoggedIn) return <LandingPage onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden scanlines text-cyan-400 select-none flex flex-col pt-16">
      <StatusBanner
        status={state.status}
        isReflexActive={state.isTactileMode && state.pressure > 20}
        isTactileMode={state.isTactileMode}
        isSerialConnected={state.isSerialConnected}
        heat={state.heat}
        vibration={state.vibration}
        pressure={state.pressure}
        manualPermissive={state.manualPermissive}
      />

      <div className="absolute inset-0 z-10">
        <Viewport3D
          joints={state.joints}
          ghostJoints={state.ghostJoints}
          status={state.status}
          power={state.power}
          viewMode={state.viewMode}
          pressure={state.pressure}
          threshold={state.safetyThreshold}
          isTactileMode={state.isTactileMode}
          gestureMode={state.gestureMode}
        />
      </div>

      <div className={`absolute left-4 top-24 z-30 pointer-events-auto transition-all duration-500`}>
        <LogicPanel
          power={state.power}
          status={state.status}
          gestureMode={state.gestureMode}
          gestureConfidence={state.gestureConfidence}
          isTactileMode={state.isTactileMode}
          manualPermissive={state.manualPermissive}
          heat={state.heat}
          vibration={state.vibration}
          pressure={state.pressure}
        />
      </div>

      <div className="absolute right-4 top-24 z-30 pointer-events-auto flex flex-col gap-4">
        <AnalyticsPanel
          data={angleHistory}
          status={state.status}
          threshold={state.safetyThreshold}
          isTactileMode={state.isTactileMode}
        />
      </div>

      <GestureMirrorSystem
        canvasRef={canvasRef}
        videoRef={videoRef}
        isTracking={isTracking}
      />

      <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto">
        <Controls
          power={state.power}
          joints={state.joints}
          gestureMode={state.gestureMode}
          safetyThreshold={state.safetyThreshold}
          pressure={state.pressure}
          heat={state.heat}
          vibration={state.vibration}
          status={state.status}
          viewMode={state.viewMode}
          isTactileMode={state.isTactileMode}
          isSerialConnected={state.isSerialConnected}
          isTracking={isTracking}
          onPowerToggle={handlePowerToggle}
          onAngleChange={() => {}}
          onJointChange={handleJointChange}
          onThresholdChange={handleThresholdChange}
          onHeatChange={() => {}}
          onVibrationChange={() => {}}
          onPermissiveToggle={handlePermissiveToggle}
          onReboot={handleReboot}
          onViewModeToggle={handleViewModeToggle}
          onTactileModeToggle={handleTactileModeToggle}
          onConnect={connectSerial}
          onGestureModeToggle={() => {
            const nextMode = mirrorMode === 'DISABLED' ? 'SHADOW' : mirrorMode === 'SHADOW' ? 'LIVE' : 'DISABLED';
            setMirrorMode(nextMode);
          }}
          onGesturePanelToggle={() => setIsDrawerOpen(!isDrawerOpen)}
          isDrawerOpen={isDrawerOpen}
          servoAngle={state.servoAngle}
        />
      </div>
    </div>
  );
};

export default App;
