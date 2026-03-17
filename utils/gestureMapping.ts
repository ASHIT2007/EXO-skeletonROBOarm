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
 * Detects if the hand is in a 'Peace Sign' state.
 * Returns true if Index and Middle fingers are extended, while others are curled.
 */
export function detectPeaceSign(landmarks: any[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  
  // Fingers to check for extension
  const extendedIndices = [8, 12]; // Index, Middle
  const curledIndices = [16, 20]; // Ring, Pinky
  const mcpIndicesExtended = [5, 9];
  const mcpIndicesCurled = [13, 17];

  // Check extended
  for (let i = 0; i < extendedIndices.length; i++) {
    if (calculateDistance(landmarks[extendedIndices[i]], landmarks[mcpIndicesExtended[i]]) < 0.15) return false;
  }
  
  // Check curled
  for (let i = 0; i < curledIndices.length; i++) {
    if (calculateDistance(landmarks[curledIndices[i]], landmarks[mcpIndicesCurled[i]]) > 0.12) return false;
  }

  // Thumb should also be somewhat tucked or at least not extended far
  if (calculateDistance(landmarks[4], landmarks[5]) > 0.15) return false;

  return true;
}

/**
 * Detects if the hand is in a 'Thumbs Up' state.
 */
export function detectThumbsUp(landmarks: any[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;

  // Thumb tip should be higher than thumb MCP
  const thumbTip = landmarks[4];
  const thumbMCP = landmarks[2];
  if (thumbTip.y > thumbMCP.y - 0.05) return false;

  // Other fingers should be curled into a fist
  const indices = [8, 12, 16, 20];
  const mcpIndices = [5, 9, 13, 17];
  
  let totalDist = 0;
  indices.forEach((idx, i) => {
    totalDist += calculateDistance(landmarks[idx], landmarks[mcpIndices[i]]);
  });
  
  return (totalDist / indices.length) < 0.1;
}

/**
 * Detects if the hand is in a fist state.
 */
export function detectFist(landmarks: any[]): boolean {
  const indices = [8, 12, 16, 20];
  const mcpIndices = [5, 9, 13, 17];
  
  let totalDist = 0;
  indices.forEach((idx, i) => {
    totalDist += calculateDistance(landmarks[idx], landmarks[mcpIndices[i]]);
  });
  
  const avgDist = totalDist / indices.length;
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
 * Maps Wrist coordinates and Hand Depth to Robot Joint States (Exo-Core v3.0 Advanced).
 * Wrist X (0-1) -> Shoulder J1 (0-180), INV MULTIPLIER for correct mirror matching.
 * Wrist Y (0-1) -> Elevation J2 (0-180), High = Up.
 * Wrist Z / Scale -> Reach J3 (0-180), Closer = Forward.
 * Wrist distance to Index -> Gripper J4.
 */
export function mapWristToRobo(landmarks: any[], prevLandmarks: any[] | null = null, prevJ4: number = 0): JointState {
  const sanitized = sanitizeLandmarks(landmarks);
  if (!sanitized) return { 
    j1: 90, j2: 135, j3: 45, j4: prevJ4, 
    fingerAngles: Array(5).fill([0, 0, 0]), 
    wristTilt: 0 
  };
  landmarks = sanitized;

  // 1. Landmark smoothing (EMA)
  if (prevLandmarks && prevLandmarks.length >= 21) {
    landmarks = landmarks.map((lm, i) => applyLandmarkEMA(lm, prevLandmarks[i], 0.15));
  }

  const wrist = landmarks[0];
  const indexMCP = landmarks[5];
  const pinkyMCP = landmarks[17];
  const indexTip = landmarks[8];

  // 2. Velocity Calculation for Dynamic Speed Scaling
  let velocityFactor = 1.0;
  if (prevLandmarks && prevLandmarks.length >= 21) {
    const dist = calculateDistance(wrist, prevLandmarks[0]);
    // Standardize: fast = >0.05 per frame, slow = <0.01
    velocityFactor = Math.max(0.4, Math.min(1.5, dist * 20)); 
  }

  // 3. J1: Shoulder Rotate (The Mirror Fix)
  // MediaPipe X is 0 (right) to 1 (left) in mirrored canvas. 
  // Physical right hand move -> X decreases.
  // We want J1 to increase for physical right movement.
  // FIX: Use raw X instead of (1-X) to invert the mapping for the mirrored camera feed
  const xNorm = Math.max(0, Math.min(1, (wrist.x - 0.2) / 0.6));
  const j1 = xNorm * 180; // Removed the (1-xNorm) to fix mirroring

  // 4. J2: Elevation (Vertical)
  const yNorm = Math.max(0, Math.min(1, (wrist.y - 0.2) / 0.6));
  const j2 = (1 - yNorm) * 180;

  // 5. J3: Depth Perception (Z-Axis / Hand Scale)
  // Distance between Index MCP and Pinky MCP as proxy for hand size/depth
  const handScale = calculateDistance(indexMCP, pinkyMCP);
  // Near (Large) ~0.2 -> 180, Far (Small) ~0.08 -> 0
  const zNorm = Math.max(0, Math.min(1, (handScale - 0.08) / 0.12));
  const j3 = zNorm * 180;

  // 6. J4: Gripper
  const gripperDist = calculateDistance(wrist, indexTip);
  const j4Raw = Math.max(0, Math.min(1, (0.22 - gripperDist) / 0.12)) * 180;

  // 7. Wrist Orientation (Pitch & Roll)
  // Pitch: Angle of middle finger relative to wrist
  const middleMCP = landmarks[9];
  const wristPitch = (0.5 - (middleMCP.y - wrist.y + 0.1)) * 180;
  
  // Roll: Angle between Index MCP and Pinky MCP on Y axis
  const rollAngle = Math.atan2(pinkyMCP.y - indexMCP.y, pinkyMCP.x - indexMCP.x) * (180 / Math.PI);
  const wristTilt = Math.max(-90, Math.min(90, rollAngle));

  // 8. Fingers: Dynamic mapping
  const fAngle = (j4Raw / 180) * 90;
  const fingerAngles = Array(5).fill([fAngle, fAngle * 0.75, fAngle * 0.5]);

  return {
    j1: Math.min(180, Math.max(0, j1)),
    j2: Math.min(180, Math.max(0, j2)),
    j3: Math.min(180, Math.max(0, j3)),
    j4: Math.min(180, Math.max(0, j4Raw)),
    fingerAngles,
    wristTilt: wristTilt
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
