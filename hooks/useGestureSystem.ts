import { useState, useCallback, useRef, useEffect } from 'react';
import { JointState, GestureMode, SystemState } from '../types';
import { GESTURE_CONFIG } from '../constants';
import { smoothJointState, mapLandmarksToJoints } from '../utils/gestureUtils';

export const useGestureSystem = (
  state: SystemState,
  setState: React.Dispatch<React.SetStateAction<SystemState>>
) => {
  const workerRef = useRef<Worker | null>(null);
  const [inferenceLatency, setInferenceLatency] = useState(0);

  useEffect(() => {
    // Initialize Worker
    workerRef.current = new Worker(
      new URL('../workers/gesture.worker.ts', import.meta.url)
    );

    workerRef.current.onmessage = (event) => {
      const { type, results } = event.data;

      if (type === 'RESULTS') {
        const startTime = (workerRef.current as any).lastFrameTime;
        if (startTime) {
          setInferenceLatency(performance.now() - startTime);
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          const score = results.multiHandedness[0].score;
          
          setState(prev => {
            const newGestureJoints = mapLandmarksToJoints(landmarks);
            const smoothedJoints = smoothJointState(
              prev.ghostJoints,
              newGestureJoints,
              prev.gestureSmoothing
            );

            return {
              ...prev,
              gestureConfidence: score,
              ghostJoints: smoothedJoints,
              // If LIVE and confidence is high, update real joints too
              joints: (prev.gestureMode === 'LIVE' && score >= GESTURE_CONFIG.CONFIDENCE_THRESHOLD && !prev.isGestureFrozen)
                ? smoothedJoints
                : prev.joints
            };
          });
        } else {
          setState(prev => ({ ...prev, gestureConfidence: 0 }));
        }
      }
    };

    workerRef.current.postMessage({ type: 'INIT' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const processFrame = useCallback((image: ImageBitmap) => {
    if (workerRef.current) {
      (workerRef.current as any).lastFrameTime = performance.now();
      workerRef.current.postMessage({ type: 'PROCESS', image }, [image]);
    }
  }, []);

  const setGestureMode = useCallback((mode: GestureMode) => {
    setState(prev => ({ ...prev, gestureMode: mode }));
  }, []);

  return { processFrame, inferenceLatency, setGestureMode };
};
