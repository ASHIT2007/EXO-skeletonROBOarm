export enum SystemStatus {
  NOMINAL = 'NOMINAL',
  CRITICAL = 'CRITICAL FAILURE',
  REBOOTING = 'REBOOTING...',
  GESTURE_LOSS = 'GESTURE LOSS'
}

export type ViewMode = 'wireframe' | 'realistic';
export type GestureMode = 'DISABLED' | 'SHADOW' | 'LIVE';

export interface JointState {
  j1: number; // Base
  j2: number; // Shoulder
  j3: number; // Elbow
  j4: number; // Gripper
}

export interface CalibrationProfile {
  offsets: JointState;
  minMax: {
    j1: [number, number];
    j6: [number, number];
  };
}

export interface SystemState {
  power: boolean;
  servoAngle: number; // Legacy position (main arm angle)
  joints: JointState; // 6-DOF State
  ghostJoints: JointState; // Preview State for SHADOW mode
  safetyThreshold: number;
  pressure: number; // Simulated contact force (0-100%)
  heat: number; // 0-100
  vibration: number; // 0-100
  manualHeat: number; // User setpoint for simulation
  manualVibration: number; // User setpoint for simulation
  manualPermissive: boolean; // For AND Gate Logic
  status: SystemStatus;
  viewMode: ViewMode;
  isTactileMode: boolean;
  isSerialConnected: boolean; // Hardware connection status
  // Gesture System State
  gestureMode: GestureMode;
  gestureConfidence: number;
  isCalibrated: boolean;
  gestureSmoothing: number;
  isGestureFrozen: boolean;
}