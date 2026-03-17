import React, { useState, useEffect, useRef } from 'react';
import { SystemStatus, SystemState, ViewMode, JointState, GestureMode } from './types';
import { Viewport3D } from './components/Viewport3D';
import { Controls } from './components/Controls';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { StatusBanner } from './components/StatusBanner';
import { LandingPage } from './components/LandingPage';
import { GestureMirrorSystem } from './components/GestureMirrorSystem';
import { useGestureMirror } from './hooks/useGestureMirror';
import { MAX_HISTORY_LENGTH } from './constants';
import { LogicPanel } from './components/LogicPanel';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Refs first for stability
  const serialPortRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const latestJointsRef = useRef<JointState>({ 
    j1: 90, j2: 135, j3: 45, j4: 0, 
    fingerAngles: Array(5).fill([0, 0, 0]), 
    wristTilt: 0 
  });
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faultCounterRef = useRef<number>(0);
  const manualTargetJointsRef = useRef<JointState>({ 
    j1: 90, j2: 135, j3: 45, j4: 0, 
    fingerAngles: Array(5).fill([0, 0, 0]), 
    wristTilt: 0 
  });

  // States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastInputTime, setLastInputTime] = useState(Date.now());
  
  const [state, setState] = useState<SystemState>({
    power: true,
    servoAngle: 0,
    joints: { 
      j1: 90, j2: 135, j3: 45, j4: 0, 
      fingerAngles: Array(5).fill([0, 0, 0]), 
      wristTilt: 0 
    },
    ghostJoints: { 
      j1: 90, j2: 135, j3: 45, j4: 0, 
      fingerAngles: Array(5).fill([0, 0, 0]), 
      wristTilt: 0 
    },
    safetyThreshold: 175,
    pressure: 0,
    heat: 30,
    vibration: 10,
    manualHeat: 50,
    manualVibration: 30,
    manualPermissive: false,
    status: SystemStatus.NOMINAL,
    viewMode: 'realistic',
    isTactileMode: false,
    isSerialConnected: false,
    gestureMode: 'DISABLED',
    gestureConfidence: 0,
    isCalibrated: false,
    gestureSmoothing: 0.25, 
    isGestureFrozen: false,
    isWarning: false
  });

  const [angleHistory, setAngleHistory] = useState<{ time: number; value: number }[]>(
    Array(MAX_HISTORY_LENGTH).fill({ time: 0, value: 0 })
  );

  const { 
    videoRef, 
    canvasRef, 
    jointAngles, 
    isTracking, 
    confidence, 
    mode: mirrorMode, 
    setMode: setMirrorMode,
    isClutchActive
  } = useGestureMirror(
    state.joints, 
    state.gestureSmoothing, 
    () => {
      // Emergency Stop: Freeze and Kill Power
      setState(prev => ({ 
        ...prev, 
        power: false, 
        status: SystemStatus.CRITICAL,
        isGestureFrozen: true 
      }));
    },
    () => {
      // Resume: Reboot and enable
      setState(prev => ({ 
        ...prev, 
        power: true, 
        status: SystemStatus.NOMINAL,
        isGestureFrozen: false
      }));
    }
  );

  // useGestureMirror and effects follow

  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      setState(prev => {
        let targetJoints = prev.gestureMode === 'LIVE' ? latestJointsRef.current : prev.joints;
        
        // 4. Manual Smoothing (LERP): If not in Live mode, smooth towards manual targets
        if (prev.gestureMode !== 'LIVE') {
          const lerp = (curr: number, target: number, alpha: number) => curr + alpha * (target - curr);
          const alpha = 0.15; // Smoothness factor for manual input
          const target = manualTargetJointsRef.current;
          
          targetJoints = {
            ...prev.joints,
            j1: lerp(prev.joints.j1, target.j1, alpha),
            j2: lerp(prev.joints.j2, target.j2, alpha),
            j3: lerp(prev.joints.j3, target.j3, alpha),
            j4: lerp(prev.joints.j4, target.j4, alpha),
            wristTilt: lerp(prev.joints.wristTilt, target.wristTilt, alpha)
          };
        }
        
        // 1. Global Joint Safety Check (Any Joint > Threshold)
        const jointsArray = [targetJoints.j1, targetJoints.j2, targetJoints.j3, targetJoints.j4];
        const anyExceeds = jointsArray.some(val => val > prev.safetyThreshold);
        
        // 2. Implement a Fault Buffer: 15 consecutive frames
        let nextStatus = prev.status;
        let nextPower = prev.power;
        let nextIsFrozen = prev.isGestureFrozen;
        let nextIsWarning = jointsArray.some(val => val > (prev.safetyThreshold - 5));

        if (anyExceeds) {
          faultCounterRef.current += 1;
          if (faultCounterRef.current >= 12) { // Slightly faster trip for safety
            nextStatus = SystemStatus.CRITICAL;
            nextPower = false;
            nextIsFrozen = true;
          }
        } else {
          faultCounterRef.current = 0;
        }

        return {
          ...prev,
          joints: targetJoints,
          gestureMode: mirrorMode,
          gestureConfidence: confidence,
          status: nextStatus,
          power: nextPower,
          isGestureFrozen: nextIsFrozen,
          isWarning: nextIsWarning
        };
      });
    }, 66);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [mirrorMode, confidence]);

  useEffect(() => {
    if (mirrorMode !== 'DISABLED' && isTracking) {
      latestJointsRef.current = jointAngles;
    }
  }, [jointAngles, mirrorMode, isTracking]);

  const handleFingerChange = (idx: number, val: number) => {
    setLastInputTime(Date.now());
    setState(prev => {
      const newFingerAngles = [...prev.joints.fingerAngles];
      // Ratio 2:1.5:1
      newFingerAngles[idx] = [val, val * 0.75, val * 0.5]; // Normalized to input (val is distal for slider display but used as base here)
      // Actually, user said 2:1.5:1 ratio. If slider is 0-90, and proximal bends most:
      const p = val * 1.0; 
      const m = p * 0.75;
      const d = p * 0.5;
      newFingerAngles[idx] = [p, m, d];
      
      return {
        ...prev,
        joints: { ...prev.joints, fingerAngles: newFingerAngles }
      };
    });
  };

  const handleWristChange = (val: number) => {
    setLastInputTime(Date.now());
    setState(prev => ({ ...prev, joints: { ...prev.joints, wristTilt: val } }));
  };

  const handleJointChange = (key: keyof JointState, val: number) => {
    setLastInputTime(Date.now());
    // 3. Manual Event Listeners: Update the target, letting the LERP loop handle the 3D sync
    manualTargetJointsRef.current = {
      ...manualTargetJointsRef.current,
      [key]: val
    };
    
    // If not in LIVE mode, we still update the state immediately for the slider's "visual" but keep the 3D smoothing separate?
    // Actually, for "perfect sync", let's update the target and let the sync loop drive the UI + 3D.
    // However, React sliders feel laggy if not updated instantly in state.
    // So we update state but keep the 3D model (joints) following the target.
    // Actually, state.joints IS what drives the 3D model. 
    // To have LERP, we update state.joints gradually in the sync loop.
  };

  // When switching modes, ensure manual targets are updated to last known position
  useEffect(() => {
    if (state.gestureMode !== 'LIVE') {
      manualTargetJointsRef.current = { ...state.joints };
    }
  }, [state.gestureMode]);

  const handleBaseChange = (val: number) => {
    handleJointChange('j1', val);
  };

  const handleReset = () => {
    setLastInputTime(Date.now());
    setState(prev => ({
      ...prev,
      joints: { 
        ...prev.joints, 
        j1: 0, 
        wristTilt: 0, 
        fingerAngles: Array(5).fill([0, 0, 0]) 
      }
    }));
  };

  const handlePreset = (preset: string) => {
    setLastInputTime(Date.now());
    setState(prev => {
      let f: number[][] = Array(5).fill([0, 0, 0]);
      switch(preset) {
        case 'FIST': f = Array(5).fill([85, 63, 42]); break; 
        case 'PINCH': 
          f = Array(5).fill([30, 22, 15]);
          f[0] = [70, 52, 35]; f[1] = [70, 52, 35]; 
          break;
        case 'POINT':
          f = Array(5).fill([80, 60, 40]);
          f[1] = [0, 0, 0];
          break;
        default: f = Array(5).fill([0, 0, 0]);
      }
      return { ...prev, joints: { ...prev.joints, fingerAngles: f } };
    });
  };

  // High-Precision Telemetry Sampler (For Analytics Graph)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = staticLatestStatusRef.current;
      if (currentStatus === SystemStatus.CRITICAL) return; // 4. E-Stop Freeze-Frame

      const { j1, j2, j3 } = staticLatestJointsRef.current;
      // 1. Data Binding & State Sync: Directly using active variables
      const differentialAngle = j1 * 0.4 + j2 * 0.3 + j3 * 0.3;
      
      setAngleHistory(prevHistory => {
        // 3. Sliding Time Window: Rolling buffer of MAX_HISTORY_LENGTH (100)
        return [...prevHistory, { 
          time: Date.now(), 
          value: differentialAngle 
        }].slice(-MAX_HISTORY_LENGTH);
      });
    }, 50); 
    return () => clearInterval(interval);
  }, []);

  const staticLatestJointsRef = useRef(state.joints);
  const staticLatestStatusRef = useRef(state.status);
  useEffect(() => { 
    staticLatestJointsRef.current = state.joints; 
    staticLatestStatusRef.current = state.status;
  }, [state.joints, state.status]);

  const connectSerial = async () => {
    if (!(navigator as any).serial) return;
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      serialPortRef.current = port;
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      writerRef.current = textEncoder.writable.getWriter();
      setState(prev => ({ ...prev, isSerialConnected: true }));
    } catch (err) { console.error(err); }
  };

  const handlePowerToggle = () => setState(prev => ({ ...prev, power: !prev.power }));
  const handleReboot = () => setState(prev => ({ ...prev, status: SystemStatus.NOMINAL }));
  const handleViewModeToggle = () => setState(prev => ({ ...prev, viewMode: prev.viewMode === 'wireframe' ? 'realistic' : 'wireframe' }));
  const handleThresholdChange = (val: number) => setState(prev => ({ ...prev, safetyThreshold: val }));

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
        isWarning={state.isWarning}
        isClutchActive={isClutchActive}
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
          lastInputTime={lastInputTime}
          orbitAzimuth={undefined}
        />
      </div>

      <div className="absolute top-24 left-4 z-40 pointer-events-auto">
        <LogicPanel 
          power={state.power}
          status={state.status}
          gestureMode={state.gestureMode}
          gestureConfidence={state.gestureConfidence}
          isTactileMode={state.isTactileMode}
          manualPermissive={state.manualPermissive}
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
        bimanualStatus="NONE"
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
          onPermissiveToggle={() => setState(prev => ({ ...prev, manualPermissive: !prev.manualPermissive }))}
          onReboot={handleReboot}
          onViewModeToggle={handleViewModeToggle}
          onTactileModeToggle={() => setState(prev => ({ ...prev, isTactileMode: !prev.isTactileMode }))}
          onConnect={connectSerial}
          onGestureModeTo={(mode) => {
            setMirrorMode(mode);
            setState(prev => ({ ...prev, gestureMode: mode }));
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
