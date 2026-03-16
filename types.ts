export enum SystemStatus {
  NOMINAL = 'NOMINAL',
  CRITICAL = 'CRITICAL FAILURE',
  REBOOTING = 'REBOOTING...',
  GESTURE_LOSS = 'GESTURE LOSS'
}

export type HandRole = 'LEFT' | 'RIGHT';
export type BimanualStatus = 'NONE' | 'SINGLE' | 'DUAL';

export interface BimanualState {
  status: BimanualStatus;
  activeHands: HandRole[];
  leftHandX: number;
  leftHandY: number;
  orbitAzimuth: number;
}

export type ViewMode = 'wireframe' | 'realistic';
export type GestureMode = 'DISABLED' | 'SHADOW' | 'LIVE';

export interface JointState {
  j1: number; // Base / Wrist Y Rotation
  j2: number; // Shoulder / Wrist X Tilt
  j3: number; // Elbow / Wrist Z Tilt
  j4: number; // Gripper / Fist
  fingerAngles: number[][]; // [fingerIndex][segmentIndex] (5x3)
  wristTilt: number;
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
  isWarning: boolean;
}