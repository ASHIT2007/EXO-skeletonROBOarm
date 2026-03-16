export const THEME = {
  cyan: '#00f0ff',
  red: '#ff003c',
  dark: '#050a0f',
  grid: '#1a2a3a'
};

export const GESTURE_CONFIG = {
  CONFIDENCE_THRESHOLD: 0.82,
  SMOOTHING_DEFAULT: 0.25,
  INFERENCE_LATENCY_MAX: 40,
  AUTO_DOWNSCALE_COUNT: 3,
  CALIBRATION_COUNTDOWN: 3
};

export const BIMANUAL_CONFIG = {
  ORBIT_RANGE: Math.PI, // ±90° camera sweep (radians)
  SINGLE_HAND_TIMEOUT_MS: 500,
  LEFT_HAND_SMOOTHING: 0.15,
};

export const MAX_HISTORY_LENGTH = 75;