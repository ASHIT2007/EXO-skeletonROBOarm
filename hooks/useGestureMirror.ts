import { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { JointState, GestureMode } from '../types';
import { mapLandmarksTo4DOF, applyExponentialSmoothing } from '../utils/gestureMapping';

export function useGestureMirror(externalState?: JointState) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const smoothedRef = useRef<JointState>({ j1: 90, j2: 90, j3: 90, j4: 0 });
  const gripperTimerRef = useRef<number | null>(null);
  const lastGripperStateRef = useRef<number>(0);

  const [jointAngles, setJointAngles] = useState<JointState>({ j1: 90, j2: 90, j3: 90, j4: 0 });
  const [isTracking, setIsTracking] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [mode, setMode] = useState<GestureMode>('DISABLED');

  // Jump prevention: When tracking starts, sync smoothed state to external
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (isTracking && !hasSyncedRef.current && externalState) {
      smoothedRef.current = { ...externalState };
      hasSyncedRef.current = true;
    }
    if (!isTracking) {
      hasSyncedRef.current = false;
    }
  }, [isTracking, externalState]);

  const onResults = useCallback((results: Results) => {
    const canvasCtx = canvasRef.current?.getContext('2d');
    if (!canvasCtx || !canvasRef.current || !videoRef.current) return;

    const { width, height } = canvasRef.current;

    // 1. Draw Mirrored Camera Feed
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);
    
    // Mirroring horizontal context
    canvasCtx.translate(width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, width, height);
    canvasCtx.restore();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      setIsTracking(true);
      setConfidence(0.9);

      // 2. Calculate Joints
      const rawJoints = mapLandmarksTo4DOF(landmarks);
      
      // 3. Gripper Smoothing (0.2s delay logic)
      // If raw j4 (fist) is different from last stable state, wait 200ms before switching
      if (rawJoints.j4 !== lastGripperStateRef.current) {
        if (!gripperTimerRef.current) {
          gripperTimerRef.current = Date.now();
        } else if (Date.now() - gripperTimerRef.current > 200) {
          lastGripperStateRef.current = rawJoints.j4;
          gripperTimerRef.current = null;
        }
      } else {
        gripperTimerRef.current = null;
      }
      
      const stabilizedJoints = { ...rawJoints, j4: lastGripperStateRef.current };

      // 4. Apply Smoothing (alpha 0.2)
      const smoothed = applyExponentialSmoothing(stabilizedJoints, smoothedRef.current, 0.2);
      smoothedRef.current = smoothed;
      setJointAngles(smoothed);

      // 5. Draw Skeleton (Mirrored)
      drawSkeleton(canvasCtx, landmarks);
    } else {
      setIsTracking(false);
      setConfidence(0);
      drawNoHand(canvasCtx);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.75,
        minTrackingConfidence: 0.75,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      if (videoRef.current && active) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.current = camera;
        
        if (mode !== 'DISABLED') {
          camera.start();
        }
      }
    }

    init();

    return () => {
      active = false;
      cameraRef.current?.stop();
    };
  }, [onResults, mode === 'DISABLED']);

  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const { width, height } = canvasRef.current!;
    
    // We must draw landmarks mirrored as well
    const getMirroredX = (x: number) => width - (x * width);

    const fingerColors = {
      thumb: '#FFD700',
      index: '#00FF88',
      middle: '#00AAFF',
      ring: '#FF8800',
      pinky: '#FF4444',
      base: '#FFFFFF'
    };

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // index
      [0, 9], [9, 10], [10, 11], [11, 12], // middle
      [0, 13], [13, 14], [14, 15], [15, 16], // ring
      [0, 17], [17, 18], [18, 19], [19, 20], // pinky
      [5, 9], [9, 13], [13, 17] // palm
    ];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    connections.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(getMirroredX(landmarks[i].x), landmarks[i].y * height);
      ctx.lineTo(getMirroredX(landmarks[j].x), landmarks[j].y * height);
      ctx.stroke();
    });

    landmarks.forEach((lm, i) => {
      let color = fingerColors.base;
      if (i >= 1 && i <= 4) color = fingerColors.thumb;
      else if (i >= 5 && i <= 8) color = fingerColors.index;
      else if (i >= 9 && i <= 12) color = fingerColors.middle;
      else if (i >= 13 && i <= 16) color = fingerColors.ring;
      else if (i >= 17 && i <= 20) color = fingerColors.pinky;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(getMirroredX(lm.x), lm.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawNoHand = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvasRef.current!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ff003c';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO HAND DETECTED', width / 2, height / 2);
  };

  return { videoRef, canvasRef, jointAngles, isTracking, confidence, mode, setMode };
}
