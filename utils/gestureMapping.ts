import { JointState } from '../types';

/**
 * Validates if a JointState object contains any NaN or invalid numbers.
 */
export function isValidJointState(state: JointState): boolean {
  const isInvalid = (n: any) => typeof n !== 'number' || isNaN(n) || !isFinite(n);
  
  if (isInvalid(state.j1) || isInvalid(state.j2) || isInvalid(state.j3) || isInvalid(state.j4) || isInvalid(state.wristTilt)) {
    return false;
  }
  
  for (const finger of state.fingerAngles) {
    for (const angle of finger) {
      if (isInvalid(angle)) return false;
    }
  }
  
  return true;
}

/**
 * Sanitizes a single landmark point for NaN/Infinity.
 */
export function sanitizeLandmark(point: any): any | null {
  if (!point || 
      isNaN(point.x) || !isFinite(point.x) ||
      isNaN(point.y) || !isFinite(point.y) ||
      isNaN(point.z) || !isFinite(point.z)) {
    return null;
  }
  return point;
}

/**
 * Applies EMA to a landmark point.
 */
export function applyLandmarkEMA(curr: any, prev: any, alpha: number = 0.12): any {
  if (!prev) return curr;
  return {
    x: prev.x + alpha * (curr.x - prev.x),
    y: prev.y + alpha * (curr.y - prev.y),
    z: prev.z + alpha * (curr.z - prev.z)
  };
}

/**
 * Ensures landmarks are valid before processing.
 */
function sanitizeLandmarks(landmarks: any[]): any[] | null {
  if (!landmarks || landmarks.length < 21) return null;
  const sanitized: any[] = [];
  for (const lm of landmarks) {
    const s = sanitizeLandmark(lm);
    if (!s) return null;
    sanitized.push(s);
  }
  return sanitized;
}

/**
 * Calculates the angle (in degrees) between three points.
 * PIP is the vertex.
 */
export function angleBetween3Points(a: any, b: any, c: any): number {
  if (!a || !b || !c) return 180;
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 * mag2 === 0) return 180;
  const val = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angle = Math.acos(val);
  return (angle * 180) / Math.PI;
}

/**
 * Computes finger curl as sum of bend angles.
 * 0 = straight, ~180 = fully curled.
 */
export function calculateFingerCurl(mcp: any, pip: any, dip: any, tip: any): number {
  const angle1 = angleBetween3Points(mcp, pip, dip);
  const angle2 = angleBetween3Points(pip, dip, tip);
  const curl = (180 - angle1) + (180 - angle2);
  return Math.min(180, Math.max(0, curl)); // Clamp 0-180
}

/**
 * Calculates Euclidean distance between two points.
 */
export function calculateDistance(p1: any, p2: any): number {
  if (!p1 || !p2) return 1;
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2));
}

/**
 * Detects if the hand is in a fist state.
 * Returns 1 for closed (fist), 0 for open.
 */
export function detectFist(landmarks: any[]): boolean {
  // Fist Detection: Check if all primary fingertips are close to their respective MCP joints
  const indices = [8, 12, 16, 20];
  const mcpIndices = [5, 9, 13, 17];
  
  let totalDist = 0;
  indices.forEach((idx, i) => {
    totalDist += calculateDistance(landmarks[idx], landmarks[mcpIndices[i]]);
  });
  
  const avgDist = totalDist / indices.length;
  // If avg distance between fingertip and its MCP is very small, it's a fist
  // 0.08 - 0.12 is typical for a closed fist
  return avgDist < 0.1;
}

/**
 * Detects if the hand is in an open palm state facing the camera.
 */
export function detectPalmOpen(landmarks: any[]): boolean {
  // Check if all primary fingertips are far from their respective MCP joints
  const indices = [8, 12, 16, 20];
  const mcpIndices = [5, 9, 13, 17];
  
  let totalDist = 0;
  indices.forEach((idx, i) => {
    totalDist += calculateDistance(landmarks[idx], landmarks[mcpIndices[i]]);
  });
  
  const avgDist = totalDist / indices.length;
  // If avg distance is large, it's an open palm
  return avgDist > 0.25;
}

/**
 * Maps Wrist coordinates and Index distance to Robot Joint States (Exo-Core v2.0 Steering).
 * Wrist X (0-1) -> Shoulder J1 (0-180), Mirrored for intuitive steering.
 * Wrist Y (0-1) -> Elbow J2/J3 (0-180), High = Up, Low = Down.
 * Distance(Wrist, IndexTip) -> Gripper J4 (Curled = 180, Extended = 0).
 */
export function mapWristToRobo(landmarks: any[], prevLandmarks: any[] | null = null, prevJ4: number = 0): JointState {
  const sanitized = sanitizeLandmarks(landmarks);
  if (!sanitized) return { 
    j1: 90, j2: 90, j3: 90, j4: prevJ4, 
    fingerAngles: Array(5).fill([0, 0, 0]), 
    wristTilt: 0 
  };
  landmarks = sanitized;

  // 1. Landmark smoothing (EMA)
  if (prevLandmarks && prevLandmarks.length >= 21) {
    landmarks = landmarks.map((lm, i) => applyLandmarkEMA(lm, prevLandmarks[i], 0.12));
  }

  const wrist = landmarks[0];
  const indexTip = landmarks[8];

  // 2. J1: Shoulder Rotate (Horizontal steering)
  // MediaPipe X is 0 (left) to 1 (right). 
  // For intuitive steering (mirrored): 1 - X
  // Map range [0.2, 0.8] to [0, 180] degrees
  const xNorm = Math.max(0, Math.min(1, (wrist.x - 0.2) / 0.6));
  const j1 = (1 - xNorm) * 180;

  // 3. J2/J3: Arm Elevation (Vertical steering)
  // High hand (Y=0.2) -> 180 (Arm Up)
  // Low hand (Y=0.8) -> 0 (Arm Down)
  const yNorm = Math.max(0, Math.min(1, (wrist.y - 0.2) / 0.6));
  const jReach = (1 - yNorm) * 180;
  
  // Distribute reach between J2 and J3 for natural movement
  const j2 = jReach * 0.6; // Primary lift
  const j3 = jReach * 0.4; // Secondary extension

  // 4. J4: Gripper / Wrist Extension
  // Distance between Wrist (0) and Index Tip (8)
  const gripperDist = calculateDistance(wrist, indexTip);
  // Extended (open) >= 0.25, Curled (closed) <= 0.12
  const j4Raw = Math.max(0, Math.min(1, (0.25 - gripperDist) / 0.13)) * 180;

  // 5. Fingers: Simple mapping based on J4 for visual consistency
  const fAngle = (j4Raw / 180) * 90;
  const fingerAngles = Array(5).fill([fAngle, fAngle * 0.75, fAngle * 0.5]);

  return {
    j1: Math.min(180, Math.max(0, j1)),
    j2: Math.min(180, Math.max(0, j2)),
    j3: Math.min(180, Math.max(0, j3)),
    j4: j4Raw,
    fingerAngles,
    wristTilt: 0
  };
}

// Legacy export for backward compatibility
export { mapWristToRobo as mapLandmarksTo4DOF };

/**
 * Exponential Smoothing helper for JointState.
 */
export function applyExponentialSmoothing(raw: JointState, smoothed: JointState, alpha: number = 0.25): JointState {
  // If raw is invalid, return smoothed to prevent corruption
  if (!isValidJointState(raw)) return smoothed;
  
  const smooth = (curr: number, target: number) => {
    const val = curr + alpha * (target - curr);
    return isNaN(val) ? curr : val;
  };
  
  return {
    j1: smooth(smoothed.j1, raw.j1),
    j2: smooth(smoothed.j2, raw.j2),
    j3: smooth(smoothed.j3, raw.j3),
    j4: smooth(smoothed.j4, raw.j4),
    wristTilt: smooth(smoothed.wristTilt, raw.wristTilt),
    fingerAngles: raw.fingerAngles.map((finger, i) => 
      finger.map((angle, j) => smooth(smoothed.fingerAngles[i][j], angle))
    )
  };
}
