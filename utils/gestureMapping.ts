import { JointState } from '../types';

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
export function detectFist(landmarks: any[]): number {
  // Fist Detection: Check if all primary fingertips are close to their respective MCP joints
  const indices = [8, 12, 16, 20];
  const mcpIndices = [5, 9, 13, 17];
  
  let totalDist = 0;
  indices.forEach((idx, i) => {
    totalDist += calculateDistance(landmarks[idx], landmarks[mcpIndices[i]]);
  });
  
  const avgDist = totalDist / indices.length;
  // If avg distance between fingertip and its MCP is very small, it's a fist
  // 0.1 - 0.15 is typical for a closed fist
  return avgDist < 0.12 ? 180 : 0;
}

/**
 * Maps MediaPipe landmarks to the 4-DOF joint configuration.
 */
export function mapLandmarksTo4DOF(landmarks: any[]): JointState {
  if (!landmarks || landmarks.length < 21) return { j1: 90, j2: 90, j3: 90, j4: 0 };

  // Helper to get finger curl
  const getCurl = (indices: number[]) => calculateFingerCurl(
    landmarks[indices[0]],
    landmarks[indices[1]],
    landmarks[indices[2]],
    landmarks[indices[3]]
  );

  // const thumbCurl = getCurl([1, 2, 3, 4]); // Not used for mapping but available
  const indexCurl = getCurl([5, 6, 7, 8]);
  const middleCurl = getCurl([9, 10, 11, 12]);
  const ringCurl = getCurl([13, 14, 15, 16]);
  const pinkyCurl = getCurl([17, 18, 19, 20]);

  // J1_BASE: Wrist X position drives base rotation.
  // In a mirrored view, we want the arm to follow the hand.
  // We apply a small deadband to prevent jitter at center
  const wristX = landmarks[0].x;
  let j1 = (wristX - 0.1) / 0.8 * 180; // Scale 0.1-0.9 to 0-180
  
  // J2_SHOULDER: Avg curl of index & middle. 
  // We use a non-linear mapping for more expressive movement
  const avgIndexMiddle = (indexCurl + middleCurl) / 2;
  let j2 = 180 - (Math.pow(avgIndexMiddle / 180, 1.2) * 180);

  // J3_ELBOW: Avg curl of ring & pinky.
  const avgRingPinky = (ringCurl + pinkyCurl) / 2;
  let j3 = 180 - (Math.pow(avgRingPinky / 180, 1.2) * 180);

  // J4_GRIPPER: Fist detection
  let j4 = detectFist(landmarks);

  // Clamping all to 0-180
  const clamp = (v: number) => Math.min(180, Math.max(0, v));

  return {
    j1: clamp(j1),
    j2: clamp(j2),
    j3: clamp(j3),
    j4: clamp(j4)
  };
}

/**
 * Exponential Smoothing helper.
 */
export function applyExponentialSmoothing(raw: JointState, smoothed: JointState, alpha: number = 0.2): JointState {
  return {
    j1: smoothed.j1 + alpha * (raw.j1 - smoothed.j1),
    j2: smoothed.j2 + alpha * (raw.j2 - smoothed.j2),
    j3: smoothed.j3 + alpha * (raw.j3 - smoothed.j3),
    j4: smoothed.j4 + alpha * (raw.j4 - smoothed.j4),
  };
}
