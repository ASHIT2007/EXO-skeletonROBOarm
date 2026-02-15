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
  status: SystemStatus;
  torqueHistory: { time: number; value: number }[];
  viewMode: ViewMode;
  isTactileMode: boolean;
}
