export enum SystemStatus {
  NOMINAL = 'NOMINAL',
  CRITICAL = 'CRITICAL FAILURE',
  REBOOTING = 'REBOOTING...'
}

export type ViewMode = 'wireframe' | 'realistic';

export interface SystemState {
  power: boolean;
  servoAngle: number;
  safetyThreshold: number;
  objectPosition: number; // New: Position of the physical obstacle (0-100)
  pressure: number; // Simulated contact force (0-100%)
  // New Sensors for Multi-Trip Mode
  heat: number; // 0-100
  vibration: number; // 0-100
  manualHeat: number; // User setpoint for simulation
  manualVibration: number; // User setpoint for simulation
  manualPermissive: boolean; // New: For AND Gate Logic
  status: SystemStatus;
  torqueHistory: { time: number; value: number }[];
  viewMode: ViewMode;
  isTactileMode: boolean;
  isSerialConnected: boolean; // New: Hardware connection status
}