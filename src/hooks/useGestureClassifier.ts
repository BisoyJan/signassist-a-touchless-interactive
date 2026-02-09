"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  DEFAULT_CONFIG,
  FEATURES_PER_FRAME,
  CLASS_LABELS,
} from "@/config";
import type { GestureResult, HandFrame } from "@/types";

interface UseGestureClassifierOptions {
  modelUrl?: string;
  labelsUrl?: string;
  sequenceLength?: number;
  confidenceThreshold?: number;
  onGestureDetected?: (result: GestureResult) => void;
}

export function useGestureClassifier(
  options: UseGestureClassifierOptions = {}
) {
  const {
    modelUrl = "/models/lstm/model.json",
    labelsUrl = "/models/lstm/labels.json",
    sequenceLength = DEFAULT_CONFIG.sequenceLength,
    confidenceThreshold = DEFAULT_CONFIG.confidenceThreshold,
    onGestureDetected,
  } = options;

  const modelRef = useRef<tf.LayersModel | null>(null);
  const modelLabelsRef = useRef<string[]>(CLASS_LABELS);
  const bufferRef = useRef<number[][]>([]);
  const isClassifyingRef = useRef(false);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  const [lastGesture, setLastGesture] = useState<GestureResult | null>(null);

  // Load the TF.js LSTM model + its labels
  const loadModel = useCallback(async () => {
    try {
      // Prefer WebGL backend
      await tf.setBackend("webgl");
      await tf.ready();

      // Load model labels (the class names used during training)
      try {
        const res = await fetch(labelsUrl);
        if (res.ok) {
          const labels: string[] = await res.json();
          if (Array.isArray(labels) && labels.length > 0) {
            modelLabelsRef.current = labels;
            console.log(`Loaded ${labels.length} model labels:`, labels);
          }
        }
      } catch {
        console.warn("Could not load labels.json — falling back to config labels");
      }

      const model = await tf.loadLayersModel(modelUrl);

      // Validate output dimension matches labels
      const outputShape = model.outputShape as number[];
      const numOutputClasses = outputShape[outputShape.length - 1];
      console.log(`Model output shape: [${outputShape}], classes: ${numOutputClasses}`);

      if (numOutputClasses !== modelLabelsRef.current.length) {
        console.warn(
          `Model output (${numOutputClasses}) != labels (${modelLabelsRef.current.length}). ` +
          `Predictions may be incorrect. Retrain the model with all classes.`
        );
        // Adjust labels to match model output if needed
        if (numOutputClasses < modelLabelsRef.current.length) {
          modelLabelsRef.current = modelLabelsRef.current.slice(0, numOutputClasses);
        }
      }

      // Info message if model knows very few classes
      if (numOutputClasses <= 2) {
        setModelInfo(
          `Model has ${numOutputClasses} class${numOutputClasses === 1 ? "" : "es"} ` +
          `(${modelLabelsRef.current.join(", ")}). Collect samples for more signs and retrain.`
        );
      }

      // Warm up with dummy input
      const dummy = tf.zeros([1, sequenceLength, FEATURES_PER_FRAME]);
      const warmup = model.predict(dummy) as tf.Tensor;
      warmup.dispose();
      dummy.dispose();

      modelRef.current = model;
      setIsModelLoaded(true);
      setModelError(null);
      console.log(
        `LSTM model loaded — ${numOutputClasses} classes: [${modelLabelsRef.current.join(", ")}]`
      );
    } catch (err) {
      console.warn("LSTM model not found (expected during development):", err);
      setModelError(
        "Model not loaded — using demo mode. Train and export your model to /public/models/lstm/"
      );
      setIsModelLoaded(false);
    }
  }, [modelUrl, labelsUrl, sequenceLength]);

  // Convert a HandFrame to a flat feature vector (63 floats)
  const handFrameToFeatures = useCallback((hand: HandFrame): number[] => {
    const features: number[] = [];
    for (const lm of hand.landmarks) {
      features.push(lm.x, lm.y, lm.z);
    }
    return features;
  }, []);

  // Push a new frame into the sliding buffer
  const pushFrame = useCallback(
    (hands: HandFrame[]) => {
      if (hands.length === 0) return;

      // Use the first detected hand
      const features = handFrameToFeatures(hands[0]);
      bufferRef.current.push(features);

      // Keep buffer at sequenceLength
      if (bufferRef.current.length > sequenceLength) {
        bufferRef.current = bufferRef.current.slice(-sequenceLength);
      }
    },
    [handFrameToFeatures, sequenceLength]
  );

  // Classify the current buffer (real model)
  const classify = useCallback(async (): Promise<GestureResult | null> => {
    if (
      !modelRef.current ||
      bufferRef.current.length < sequenceLength ||
      isClassifyingRef.current
    ) {
      return null;
    }

    isClassifyingRef.current = true;

    try {
      const result = tf.tidy(() => {
        const input = tf.tensor3d([bufferRef.current]);
        const prediction = modelRef.current!.predict(input) as tf.Tensor;
        return prediction.dataSync();
      });

      const maxIdx = result.indexOf(Math.max(...Array.from(result)));
      const confidence = result[maxIdx];
      const labels = modelLabelsRef.current;

      // Guard: make sure index is within the model's label set
      if (maxIdx >= labels.length) {
        console.warn(`Prediction index ${maxIdx} out of range for ${labels.length} labels`);
        return null;
      }

      if (confidence >= confidenceThreshold) {
        const gesture: GestureResult = {
          label: labels[maxIdx],
          confidence,
          source: "lstm",
        };
        setLastGesture(gesture);
        onGestureDetected?.(gesture);
        return gesture;
      }

      return null;
    } catch (err) {
      console.error("Classification error:", err);
      return null;
    } finally {
      isClassifyingRef.current = false;
    }
  }, [sequenceLength, confidenceThreshold, onGestureDetected]);

  // Demo mode: disabled — no fake random predictions
  const classifyDemo = useCallback((): GestureResult | null => {
    // In demo mode (no model loaded), we don't generate fake predictions.
    // The user should train and deploy a real model first.
    return null;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      modelRef.current?.dispose();
    };
  }, []);

  return {
    loadModel,
    pushFrame,
    classify: isModelLoaded ? classify : classifyDemo,
    isModelLoaded,
    modelError,
    modelInfo,
    lastGesture,
    bufferLength: bufferRef.current.length,
  };
}
