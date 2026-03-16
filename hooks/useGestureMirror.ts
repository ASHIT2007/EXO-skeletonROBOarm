import { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { JointState, GestureMode, BimanualState, HandRole, BimanualStatus } from '../types';
import { mapWristToRobo, applyExponentialSmoothing, detectFist, detectPalmOpen, isValidJointState } from '../utils/gestureMapping';
import { BIMANUAL_CONFIG } from '../constants';

export function useGestureMirror(externalState?: JointState, smoothingAlpha: number = 0.2, onEmergencyStop?: () => void, onEmergencyResume?: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const smoothedRef = useRef<JointState>({ j1: 90, j2: 90, j3: 90, j4: 0, fingerAngles: Array(5).fill(null).map(() => [0, 0, 0]), wristTilt: 0 });
  const lastGripperStateRef = useRef<number>(0);
  const safetyCooldownRef = useRef<number>(0);
  const lastLandmarksRef = useRef<any[] | null>(null);
  const isClutchActiveRef = useRef<boolean>(false);

  const [jointAngles, setJointAngles] = useState<JointState>({ j1: 90, j2: 90, j3: 90, j4: 0, fingerAngles: Array(5).fill([0, 0, 0]), wristTilt: 0 });
  const [isTracking, setIsTracking] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [mode, setMode] = useState<GestureMode>('DISABLED');

  // State for tracking

  // Jump prevention
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
    canvasCtx.translate(width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, width, height);
    canvasCtx.restore();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setIsTracking(true);
      setConfidence(0.9);

      const mainHand = results.multiHandLandmarks[0];
      
      // 2. Process Hand (Main Steering Control)
      let currentJoints = { ...smoothedRef.current };
      const rawJoints = mapWristToRobo(mainHand, lastLandmarksRef.current, lastGripperStateRef.current);
      
      // FRAME DISCARDING: Only proceed if tracking data is valid
      if (isValidJointState(rawJoints)) {
        lastLandmarksRef.current = mainHand;
        lastGripperStateRef.current = rawJoints.j4;

        if (!isClutchActiveRef.current) {
          currentJoints = rawJoints;
        }
      }

      // 3. Safety Gestures
      if (Date.now() - safetyCooldownRef.current > 1000) {
        if (detectPalmOpen(mainHand)) {
          onEmergencyStop?.();
          safetyCooldownRef.current = Date.now();
        } else if (detectFist(mainHand)) {
          onEmergencyResume?.();
          safetyCooldownRef.current = Date.now();
        }
      }

      drawSkeleton(canvasCtx, mainHand, 'RIGHT'); // Legacy 'RIGHT' label or omit

      // 5. Smoothing & Set State
      if (!isClutchActiveRef.current) {
        const smoothed = applyExponentialSmoothing(currentJoints, smoothedRef.current, 0.25);
        smoothedRef.current = smoothed;
        setJointAngles(smoothed);
      }

    } else {
      setIsTracking(false);
      setConfidence(0);
      drawNoHand(canvasCtx);
    }
  }, [smoothingAlpha]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') isClutchActiveRef.current = true; };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') isClutchActiveRef.current = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
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
        if ((mode as string) !== 'DISABLED') camera.start();
      }
    }
    init();
    return () => {
      active = false;
      cameraRef.current?.stop();
      handsRef.current?.close();
    };
  }, [onResults, (mode as string) === 'DISABLED']);

  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], role: HandRole) => {
    const { width, height } = canvasRef.current!;
    const getMirroredX = (x: number) => width - (x * width);

    const color = role === 'RIGHT' ? '#00f0ff' : '#ff00ff'; // Cyan for Right, Magenta for Left
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]
    ];

    connections.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(getMirroredX(landmarks[i].x), landmarks[i].y * height);
      ctx.lineTo(getMirroredX(landmarks[j].x), landmarks[j].y * height);
      ctx.stroke();
    });

    // Draw Wrist Label
    ctx.fillStyle = color;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(role === 'RIGHT' ? 'RIGHT' : 'LEFT', getMirroredX(landmarks[0].x) + 5, landmarks[0].y * height - 5);
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

  return { videoRef, canvasRef, jointAngles, isTracking, confidence, mode, setMode, isClutchActive: isClutchActiveRef.current };
}
