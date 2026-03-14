import { JointState } from '../types';

/**
 * Calculates the angle between two points in 3D space using atan2.
 * Returns value in degrees (0-180).
 */
export const calculateAngle = (
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number => {
  const dy = p2.y - p1.y;
  const dx = p2.x - p1.x;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Normalize to 0-180 range based on typical human joint limits
  angle = Math.abs(angle);
  return Math.min(180, Math.max(0, angle));
};

/**
 * Calculates Euclidean distance between two points.
 */
export const calculateDistance = (
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number => {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + 
    Math.pow(p2.y - p1.y, 2) + 
    Math.pow(p2.z - p1.z, 2)
  );
};

/**
 * Exponential smoothing (Kalman-style)
 */
export const smoothValue = (current: number, target: number, alpha: number): number => {
  return current + alpha * (target - current);
};

/**
 * Maps MediaPipe landmarks to 6-DOF JointState
 */
export const mapLandmarksToJoints = (landmarks: any[]): JointState => {
  if (!landmarks || landmarks.length < 21) {
    return { j1: 0, j2: 0, j3: 0, j4: 0 };
  }

  // Wrist (0)
  const wrist = landmarks[0];
  // Index MCP (5) to Index PIP (6)
  const indexMCP = landmarks[5];
  const indexPIP = landmarks[6];
  // Middle MCP (9) to Middle PIP (10)
  const middleMCP = landmarks[9];
  const middlePIP = landmarks[10];
  // Ring MCP (13) to Ring PIP (14)
  const ringMCP = landmarks[13];
  const ringPIP = landmarks[14];
  // Thumb CMC (1) to Thumb MCP (2)
  const thumbCMC = landmarks[1];
  const thumbMCP = landmarks[2];
  // Index Tip (8) and Thumb Tip (4) for gripper
  const indexTip = landmarks[8];
  const thumbTip = landmarks[4];

  // Mapping logic as per requirements:
  
  // J1: Wrist X position mapped (0.5 center, 0-1 across frame)
  // Assuming camera width normalization 0-1
  const j1 = Math.min(180, Math.max(0, (1 - wrist.x) * 180));

  // J2: Index MCP to Index PIP angle
  const j2 = calculateAngle(indexMCP, indexPIP);

  // J3: Middle MCP to Middle PIP angle
  const j3 = calculateAngle(middleMCP, middlePIP);

  // J4: Ring MCP to Ring PIP angle
  const j4 = calculateAngle(ringMCP, ringPIP);

  // J5: Thumb CMC to Thumb MCP angle
  const j5 = calculateAngle(thumbCMC, thumbMCP);

  // J6: Gripper based on pinch distance
  const pinchDist = calculateDistance(indexTip, thumbTip);
  // Normalize distance (assuming 0.05 - 0.2 range)
  const j6 = Math.min(180, Math.max(0, (1 - (pinchDist - 0.05) / 0.15) * 180));

  return { j1, j2, j3, j4 };
};

/**
 * Moving Average Filter
 */
const MA_BUFFERS: Record<string, number[][]> = {};
const WINDOW_SIZE = 5;

export const applyMovingAverage = (joints: JointState, id: string = 'default'): JointState => {
  if (!MA_BUFFERS[id]) {
    MA_BUFFERS[id] = [
      Array(WINDOW_SIZE).fill(joints.j1 || 90),
      Array(WINDOW_SIZE).fill(joints.j2 || 90),
      Array(WINDOW_SIZE).fill(joints.j3 || 90),
      Array(WINDOW_SIZE).fill(joints.j4 || 0)
    ];
  }

  const keys: (keyof JointState)[] = ['j1', 'j2', 'j3', 'j4'];
  const result: any = {};

  keys.forEach((key, i) => {
    MA_BUFFERS[id][i].push(joints[key] || 0);
    if (MA_BUFFERS[id][i].length > WINDOW_SIZE) {
      MA_BUFFERS[id][i].shift();
    }
    const sum = MA_BUFFERS[id][i].reduce((a, b) => a + b, 0);
    result[key] = sum / MA_BUFFERS[id][i].length;
  });

  return result as JointState;
};

/**
 * Smooths an entire JointState
 */
export const smoothJointState = (
  current: JointState,
  target: JointState,
  alpha: number
): JointState => {
  const filteredTarget = applyMovingAverage(target);
  
  return {
    j1: smoothValue(current.j1, filteredTarget.j1, alpha),
    j2: smoothValue(current.j2, filteredTarget.j2, alpha),
    j3: smoothValue(current.j3, filteredTarget.j3, alpha),
    j4: smoothValue(current.j4, filteredTarget.j4, alpha),
  };
};
