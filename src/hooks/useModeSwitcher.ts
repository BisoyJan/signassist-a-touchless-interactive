"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { HandFrame, InteractionMode } from "@/types";

/**
 * Detect "closed fist" — all five fingertips are BELOW (higher y)
 * their respective PIP/IP joints, meaning all fingers are curled.
 *
 * Landmark indices (MediaPipe):
 *   Thumb:  tip=4   ip=3
 *   Index:  tip=8   pip=6
 *   Middle: tip=12  pip=10
 *   Ring:   tip=16  pip=14
 *   Pinky:  tip=20  pip=18
 */
function isClosedFist(hand: HandFrame): boolean {
  const lm = hand.landmarks;
  if (lm.length < 21) return false;

  const wrist = lm[0];
  const thumbCurled =
    Math.abs(lm[4].x - wrist.x) < Math.abs(lm[3].x - wrist.x);

  const indexCurled = lm[8].y > lm[6].y;
  const middleCurled = lm[12].y > lm[10].y;
  const ringCurled = lm[16].y > lm[14].y;
  const pinkyCurled = lm[20].y > lm[18].y;

  return thumbCurled && indexCurled && middleCurled && ringCurled && pinkyCurled;
}

/**
 * Detect "thumbs up" — thumb tip extended upward, all other fingers curled.
 */
function isThumbsUp(hand: HandFrame): boolean {
  const lm = hand.landmarks;
  if (lm.length < 21) return false;

  const thumbExtended = lm[4].y < lm[3].y;
  const indexCurled = lm[8].y > lm[6].y;
  const middleCurled = lm[12].y > lm[10].y;
  const ringCurled = lm[16].y > lm[14].y;
  const pinkyCurled = lm[20].y > lm[18].y;

  return thumbExtended && indexCurled && middleCurled && ringCurled && pinkyCurled;
}

/**
 * Identify which gesture combo is held with two hands:
 *   - Two fists        → "navigate"
 *   - Two thumbs up    → "spelling"
 *   - One fist + one thumbs up → "sign" (motion-trained model)
 */
function detectGestureTarget(hands: HandFrame[]): InteractionMode | null {
  if (hands.length < 2) return null;

  const h0Fist = isClosedFist(hands[0]);
  const h1Fist = isClosedFist(hands[1]);
  const h0Thumb = isThumbsUp(hands[0]);
  const h1Thumb = isThumbsUp(hands[1]);

  if (h0Fist && h1Fist) return "navigate";
  if (h0Thumb && h1Thumb) return "spelling";
  if ((h0Fist && h1Thumb) || (h0Thumb && h1Fist)) return "sign";

  return null;
}

/** Duration (ms) gesture must be held to switch mode. */
const HOLD_DURATION = 1000;

/** Cooldown (ms) after a switch before another can occur. */
const TOGGLE_COOLDOWN = 1500;

interface UseModeSwitcherOptions {
  /** Initial mode. Default: "sign" */
  initialMode?: InteractionMode;
}

export function useModeSwitcher(options: UseModeSwitcherOptions = {}) {
  const { initialMode = "sign" } = options;

  const [mode, setMode] = useState<InteractionMode>(initialMode);
  /** Progress 0-1 showing how close the user is to switching. */
  const [holdProgress, setHoldProgress] = useState(0);
  /** Whether a mode-switch gesture is currently being held. */
  const [isHolding, setIsHolding] = useState(false);
  /** Which mode the current hold gesture is targeting (for UI labels). */
  const [holdTarget, setHoldTarget] = useState<InteractionMode | null>(null);

  const holdStartRef = useRef<number | null>(null);
  const lastToggleRef = useRef(0);
  const holdTargetRef = useRef<InteractionMode | null>(null);
  const animRef = useRef<number>(0);

  // Manually set mode (e.g. from a button click)
  const setModeManual = useCallback((target: InteractionMode) => {
    setMode(target);
    holdStartRef.current = null;
    holdTargetRef.current = null;
    setHoldProgress(0);
    setIsHolding(false);
    setHoldTarget(null);
    lastToggleRef.current = performance.now();
  }, []);

  /**
   * Feed hand frames to detect gesture holds.
   * Call this from the hand-tracking results callback every frame.
   */
  const checkModeGesture = useCallback(
    (hands: HandFrame[]) => {
      const now = performance.now();

      // Respect cooldown
      if (now - lastToggleRef.current < TOGGLE_COOLDOWN) {
        if (holdStartRef.current !== null) {
          holdStartRef.current = null;
          holdTargetRef.current = null;
          setHoldProgress(0);
          setIsHolding(false);
          setHoldTarget(null);
        }
        return;
      }

      const target = detectGestureTarget(hands);

      // Only start/continue a hold if the target differs from current mode
      const isValidTarget = target !== null && target !== mode;

      if (isValidTarget) {
        // Started a new gesture or continuing the same one
        if (holdStartRef.current === null || holdTargetRef.current !== target) {
          holdStartRef.current = now;
          holdTargetRef.current = target;
        }

        const elapsed = now - holdStartRef.current;
        const progress = Math.min(elapsed / HOLD_DURATION, 1);
        setHoldProgress(progress);
        setIsHolding(true);
        setHoldTarget(target);

        if (progress >= 1) {
          // Switch!
          setMode(target);
          holdStartRef.current = null;
          holdTargetRef.current = null;
          setHoldProgress(0);
          setIsHolding(false);
          setHoldTarget(null);
          lastToggleRef.current = now;
        }
      } else {
        // No valid gesture → reset (only update state if something was active
        // to avoid unnecessary re-renders on every frame)
        if (holdStartRef.current !== null) {
          holdStartRef.current = null;
          holdTargetRef.current = null;
          setHoldProgress(0);
          setIsHolding(false);
          setHoldTarget(null);
        }
      }
    },
    [mode]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return {
    /** Current interaction mode. */
    mode,
    /** Manually set mode (e.g. from a button). */
    setModeManual,
    /** Feed hands each frame to detect gesture holds. */
    checkModeGesture,
    /** 0-1 progress of the current hold. */
    holdProgress,
    /** Whether a mode-switch gesture is actively being held. */
    isHolding,
    /** Which mode the current hold gesture is targeting. */
    holdTarget,
  };
}
