import { Hands, Results } from '@mediapipe/hands';

let hands: Hands | null = null;

// Initialize MediaPipe Hands in the worker
const initHands = async () => {
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    },
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults((results: Results) => {
    // Post results back to main thread
    self.postMessage({ type: 'RESULTS', results });
  });
};

self.onmessage = async (event) => {
  const { type, image } = event.data;

  if (type === 'INIT') {
    await initHands();
    self.postMessage({ type: 'READY' });
  } else if (type === 'PROCESS' && hands && image) {
    // In a real worker, image would be an ImageBitmap or similar from an OffscreenCanvas
    try {
      await hands.send({ image });
    } catch (err) {
      console.error('Worker inference error:', err);
    }
  }
};
