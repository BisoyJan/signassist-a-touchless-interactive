"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  MEDIAPIPE_WASM_PATH,
  HAND_LANDMARKER_MODEL_URL,
  DEFAULT_CONFIG,
} from "@/config";
import type { HandFrame, Landmark } from "@/types";

interface UseHandTrackerOptions {
  onResults?: (hands: HandFrame[]) => void;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export function useHandTracker(options: UseHandTrackerOptions = {}) {
  const {
    onResults,
    minDetectionConfidence = DEFAULT_CONFIG.handDetectionConfidence,
    minTrackingConfidence = DEFAULT_CONFIG.handTrackingConfidence,
  } = options;

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(-1);

  // Keep a ref to the latest onResults callback to avoid stale closures
  // in the requestAnimationFrame detection loop.
  const onResultsRef = useRef(onResults);
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Initialize MediaPipe Hand Landmarker
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_LANDMARKER_MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: minDetectionConfidence,
        minTrackingConfidence: minTrackingConfidence,
      });

      handLandmarkerRef.current = landmarker;
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to initialize HandLandmarker:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initialize hand tracker"
      );
      setIsLoading(false);
    }
  }, [minDetectionConfidence, minTrackingConfidence]);

  // Start webcam and begin detection loop
  const startTracking = useCallback(
    async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
      videoRef.current = video;
      canvasRef.current = canvas;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });
        video.srcObject = stream;
        await video.play();
        setIsTracking(true);

        // Begin detection loop
        const detect = () => {
          if (!handLandmarkerRef.current || !videoRef.current) return;

          const now = performance.now();
          if (now === lastTimestampRef.current) {
            animFrameRef.current = requestAnimationFrame(detect);
            return;
          }
          lastTimestampRef.current = now;

          const result: HandLandmarkerResult =
            handLandmarkerRef.current.detectForVideo(videoRef.current, now);

          // Convert to our HandFrame type
          const hands: HandFrame[] = result.landmarks.map(
            (handLandmarks, i) => ({
              landmarks: handLandmarks.map(
                (lm): Landmark => ({
                  x: lm.x,
                  y: lm.y,
                  z: lm.z,
                })
              ),
              handedness:
                (result.handednesses[i]?.[0]?.categoryName as
                  | "Left"
                  | "Right") ?? "Right",
              timestamp: now,
            })
          );

          // Draw video frame + landmarks on canvas
          drawLandmarks(canvas, result, video.videoWidth, video.videoHeight, video);

          if (onResultsRef.current) {
            onResultsRef.current(hands);
          }

          animFrameRef.current = requestAnimationFrame(detect);
        };

        detect();
      } catch (err) {
        console.error("Failed to start webcam:", err);
        setError(
          err instanceof Error ? err.message : "Failed to access webcam"
        );
      }
    },
    []
  );

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      handLandmarkerRef.current?.close();
    };
  }, [stopTracking]);

  return {
    initialize,
    startTracking,
    stopTracking,
    isLoading,
    isTracking,
    error,
  };
}

// ── Draw hand landmarks on canvas ──────────────────────────
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm
];

function drawLandmarks(
  canvas: HTMLCanvasElement,
  result: HandLandmarkerResult,
  videoWidth: number,
  videoHeight: number,
  video: HTMLVideoElement
) {
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw mirrored video frame as background
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw landmarks mirrored to match
  for (const handLandmarks of result.landmarks) {
    // Draw connections
    ctx.strokeStyle = "#00FF88";
    ctx.lineWidth = 2;
    for (const [start, end] of HAND_CONNECTIONS) {
      const s = handLandmarks[start];
      const e = handLandmarks[end];
      ctx.beginPath();
      ctx.moveTo((1 - s.x) * videoWidth, s.y * videoHeight);
      ctx.lineTo((1 - e.x) * videoWidth, e.y * videoHeight);
      ctx.stroke();
    }

    // Draw landmark points
    ctx.fillStyle = "#FFFF00";
    for (const lm of handLandmarks) {
      ctx.beginPath();
      ctx.arc((1 - lm.x) * videoWidth, lm.y * videoHeight, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
