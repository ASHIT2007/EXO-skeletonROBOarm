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
  } = useGestureMirror(state.joints, state.gestureSmoothing);

  const serialPortRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const thresholdTimerRef = useRef<number | null>(null);

  const latestJointsRef = useRef<JointState>(state.joints);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Throttled UI Sync (15fps) - Only syncs to state if mirroring is active
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      if (mirrorMode !== 'DISABLED') {
        setState(prev => {
          // Only update state if values have actually changed significantly or if we need to sync for UI
          // This prevents massive re-renders of the entire dashboard
          const jointsChanged = JSON.stringify(prev.joints) !== JSON.stringify(latestJointsRef.current);
          if (!jointsChanged && prev.gestureMode === mirrorMode) return prev;
          
          return {
            ...prev,
            joints: latestJointsRef.current,
            gestureMode: mirrorMode,
            gestureConfidence: confidence
          };
        });
      }
    }, 66); // ~15fps for UI/Serial updates

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [mirrorMode, confidence]);

  // High-Frequency Data Feed (30fps+) - Direct to Ref
  useEffect(() => {
    if (mirrorMode !== 'DISABLED') {
      const shouldOverride = mirrorMode === 'LIVE' && isTracking;
      if (shouldOverride) {
        latestJointsRef.current = jointAngles;
      }

      // Update GESTURE_LOSS status in state immediately if it changes
      setState(prev => {
        const isMirroringActive = mirrorMode !== ('DISABLED' as GestureMode);
        const newStatus = (isTracking || !isMirroringActive) 
          ? (prev.status === SystemStatus.GESTURE_LOSS ? SystemStatus.NOMINAL : prev.status) 
          : SystemStatus.GESTURE_LOSS;
        
        if (prev.status === newStatus) return prev;
        return { ...prev, status: newStatus };
      });
    } else {
      latestJointsRef.current = state.joints;
    }
  }, [jointAngles, mirrorMode, isTracking]);

  // Dedicated Serial Transmitter (Handles both gesture and manual)
  useEffect(() => {
    if (state.isSerialConnected && writerRef.current) {
      const { j1, j2, j3, j4 } = state.joints;
      const payload = `${Math.round(j1)},${Math.round(j2)},${Math.round(j3)},${Math.round(j4)}\n`;
      writerRef.current.write(payload).catch(() => {});
    }
  }, [state.joints, state.isSerialConnected]);

  // High-Precision Telemetry Sampler (For Analytics Graph)
  useEffect(() => {
    const interval = setInterval(() => {
      // Sum of absolute joint velocities/changes often feels more "real" for telemetry
      // but here we'll use a weighted average of active joints for a smoother 'System Load' look
      const currentBending = (
        state.joints.j1 * 0.1 + 
        state.joints.j2 * 0.4 + 
        state.joints.j3 * 0.4 + 
        state.joints.j4 * 0.1
      );
      
      setAngleHistory(prevHistory => {
        return [...prevHistory, { 
          time: Date.now(), 
          value: currentBending 
        }].slice(-MAX_HISTORY_LENGTH);
      });
    }, 50); // 20Hz sampling for smoother flow

    return () => clearInterval(interval);
  }, [state.joints]); 

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
          onGestureModeTo={(m) => setMirrorMode(m)}
          onGesturePanelToggle={() => setIsDrawerOpen(!isDrawerOpen)}
          isDrawerOpen={isDrawerOpen}
          servoAngle={state.servoAngle}
        />
      </div>
    </div>
  );
};

export default App;
