"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { HandFrame } from "@/types";

/** Minimum distance (normalised) between thumb-tip and index-tip to count as a pinch. */
const PINCH_THRESHOLD = 0.06;

/** Cooldown (ms) between consecutive clicks to prevent repeats. */
const CLICK_COOLDOWN = 600;

/** Smoothing factor for cursor position (0 = instant, higher = smoother but laggier). */
const SMOOTH_FACTOR = 0.25;

export interface CursorState {
    /** Screen-space X position of the virtual cursor. */
    x: number;
    /** Screen-space Y position of the virtual cursor. */
    y: number;
    /** Whether the user is currently pinching (clicking). */
    isPinching: boolean;
    /** Whether the cursor is hovering over an interactive element. */
    isHovering: boolean;
    /** Whether a hand is visible and the cursor should be shown. */
    visible: boolean;
}

interface UseHandNavigationOptions {
    /** CSS selector for interactive elements. Default: '[data-hand-nav]' */
    selector?: string;
}

export function useHandNavigation(options: UseHandNavigationOptions = {}) {
    const { selector = "[data-hand-nav]" } = options;

    // Use a ref for the cursor DOM element so we can update it at 30fps
    // without waiting for React re-renders.
    const cursorRef = useRef<CursorState>({
        x: 0, y: 0, isPinching: false, isHovering: false, visible: false,
    });

    // State is only used for visibility / pinch / hover changes
    // (which are infrequent and need to trigger re-renders).
    const [cursorState, setCursorState] = useState<CursorState>(cursorRef.current);

    // Direct DOM ref for the cursor element — bypasses React for smooth movement
    const cursorDomRef = useRef<HTMLDivElement | null>(null);

    const smoothX = useRef(0);
    const smoothY = useRef(0);
    const initialised = useRef(false);
    const lastClickTime = useRef(0);
    const hoveredElement = useRef<HTMLElement | null>(null);
    const wasPinching = useRef(false);

    const selectorRef = useRef(selector);
    useEffect(() => {
        selectorRef.current = selector;
    }, [selector]);

    /**
     * Move the cursor DOM elements directly for lag-free tracking.
     * Call from the hand-tracking loop.
     */
    const updateFromHands = useCallback((hands: HandFrame[], isEnabled: boolean) => {
        if (!isEnabled || hands.length === 0) {
            if (cursorRef.current.visible) {
                cursorRef.current = { ...cursorRef.current, visible: false, isPinching: false, isHovering: false };
                setCursorState(cursorRef.current);
            }
            if (hoveredElement.current) {
                hoveredElement.current.removeAttribute("data-hand-hover");
                hoveredElement.current = null;
            }
            initialised.current = false;
            return;
        }

        const hand = hands[0];
        const indexTip = hand.landmarks[8];
        const thumbTip = hand.landmarks[4];
        if (!indexTip || !thumbTip) return;

        // Map normalised MediaPipe coords → screen coords (mirrored)
        const rawX = (1 - indexTip.x) * window.innerWidth;
        const rawY = indexTip.y * window.innerHeight;

        // On first frame, snap to position (no smoothing lag)
        if (!initialised.current) {
            smoothX.current = rawX;
            smoothY.current = rawY;
            initialised.current = true;
        } else {
            smoothX.current += (rawX - smoothX.current) * (1 - SMOOTH_FACTOR);
            smoothY.current += (rawY - smoothY.current) * (1 - SMOOTH_FACTOR);
        }

        const cx = smoothX.current;
        const cy = smoothY.current;

        // ── Move DOM element directly (bypass React) ──────────
        if (cursorDomRef.current) {
            cursorDomRef.current.style.transform = `translate(${cx}px, ${cy}px)`;
        }

        // ── Detect pinch ──────────────────────────────────────
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dz = thumbTip.z - indexTip.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const isPinching = distance < PINCH_THRESHOLD;

        // ── Hit-test interactive elements ─────────────────────
        const elUnder = document.elementFromPoint(cx, cy) as HTMLElement | null;
        const navTarget = elUnder?.closest(selectorRef.current) as HTMLElement | null;

        if (navTarget !== hoveredElement.current) {
            hoveredElement.current?.removeAttribute("data-hand-hover");
            if (navTarget) navTarget.setAttribute("data-hand-hover", "true");
            hoveredElement.current = navTarget;
        }

        const isHovering = navTarget !== null;

        // ── Pinch → click ─────────────────────────────────────
        if (isPinching && !wasPinching.current) {
            const now = performance.now();
            if (now - lastClickTime.current > CLICK_COOLDOWN && navTarget) {
                lastClickTime.current = now;
                navTarget.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
                navTarget.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
                navTarget.click();
            }
        }
        wasPinching.current = isPinching;

        // Only trigger React re-render when visibility / hover / pinch *changes*
        const prev = cursorRef.current;
        if (!prev.visible || prev.isPinching !== isPinching || prev.isHovering !== isHovering) {
            cursorRef.current = { x: cx, y: cy, isPinching, isHovering, visible: true };
            setCursorState(cursorRef.current);
        } else {
            // Update ref (for HandCursor's initial position) silently
            cursorRef.current = { x: cx, y: cy, isPinching, isHovering, visible: true };
        }
    }, []);

    return { cursor: cursorState, cursorDomRef, updateFromHands };
}
