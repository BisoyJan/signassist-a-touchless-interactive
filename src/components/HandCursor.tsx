"use client";

import { useEffect, useRef } from "react";
import type { CursorState } from "@/hooks/useHandNavigation";
import type { InteractionMode } from "@/types";

interface HandCursorProps {
  cursor: CursorState;
  mode: InteractionMode;
  holdProgress: number;
  holdTarget: InteractionMode | null;
  /** Attach this ref to the cursor wrapper so the hook can move it directly. */
  cursorDomRef: React.RefObject<HTMLDivElement | null>;
}

/** Emoji and colour per target mode */
const MODE_STYLE: Record<InteractionMode, { emoji: string; color: string; label: string; textClass: string }> = {
  navigate: { emoji: "✊✊", color: "#a855f7", label: "Navigation Mode", textClass: "text-purple-300" },
  spelling: { emoji: "👍👍", color: "#38bdf8", label: "Spelling Mode", textClass: "text-sky-300" },
  sign:     { emoji: "✊👍", color: "#22c55e", label: "Motion Model Mode", textClass: "text-green-300" },
};

/**
 * Floating cursor + mode-switch progress.
 *
 * Position is driven by direct DOM manipulation (via cursorDomRef)
 * from the useHandNavigation hook, so movement stays at 30 fps
 * regardless of React render cadence.
 */
export default function HandCursor({ cursor, mode, holdProgress, holdTarget, cursorDomRef }: HandCursorProps) {
  // ── Non-navigate modes: show hold progress only ──────────
  if (mode !== "navigate") {
    if (holdProgress <= 0 || !holdTarget) return null;
    const style = MODE_STYLE[holdTarget];
    return (
      <div className="fixed inset-0 z-[9999] pointer-events-none" aria-hidden="true">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <ProgressRing progress={holdProgress} color={style.color} emoji={style.emoji} />
          <span className={`text-xs ${style.textClass} bg-gray-900/80 px-2 py-0.5 rounded`}>
            Switch to {style.label}
          </span>
        </div>
      </div>
    );
  }

  // ── Navigate mode, hand not visible ──────────────────────
  if (!cursor.visible) {
    if (holdProgress <= 0 || !holdTarget) return null;
    const style = MODE_STYLE[holdTarget];
    return (
      <div className="fixed inset-0 z-[9999] pointer-events-none" aria-hidden="true">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <ProgressRing progress={holdProgress} color={style.color} emoji={style.emoji} />
          <span className={`text-xs ${style.textClass} bg-gray-900/80 px-2 py-0.5 rounded`}>
            Switch to {style.label}
          </span>
        </div>
      </div>
    );
  }

  // ── Navigate mode, cursor visible ────────────────────────
  const size = cursor.isPinching ? 28 : cursor.isHovering ? 40 : 32;
  const color = cursor.isPinching
    ? "rgba(34,197,94,0.95)"
    : cursor.isHovering
      ? "rgba(250,204,21,0.85)"
      : "rgba(255,255,255,0.7)";

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" aria-hidden="true">
      {/*
        This wrapper is positioned by the hook via cursorDomRef.
        The hook sets transform: translate(Xpx, Ypx) directly on this div.
      */}
      <div ref={cursorDomRef} className="absolute top-0 left-0 will-change-transform">
        {/* Cursor ring */}
        <div
          className="rounded-full border-[3px] transition-[width,height,border-color,box-shadow,background-color] duration-100 ease-out"
          style={{
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            borderColor: color,
            boxShadow: cursor.isPinching
              ? `0 0 20px ${color}, 0 0 40px ${color}`
              : cursor.isHovering
                ? `0 0 12px ${color}`
                : `0 0 6px ${color}`,
            backgroundColor: cursor.isPinching ? "rgba(34,197,94,0.25)" : "transparent",
          }}
        />

        {/* Centre dot */}
        <div
          className="absolute top-0 left-0 rounded-full -translate-x-1/2 -translate-y-1/2 transition-[width,height] duration-100"
          style={{
            width: cursor.isPinching ? 10 : 6,
            height: cursor.isPinching ? 10 : 6,
            backgroundColor: color,
          }}
        />

        {/* Click ripple */}
        {cursor.isPinching && (
          <div
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping"
            style={{
              width: 48,
              height: 48,
              border: `2px solid ${color}`,
              opacity: 0.5,
            }}
          />
        )}

        {/* Mode badge */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-600/80 text-white whitespace-nowrap"
          style={{ top: size / 2 + 8, opacity: 0.85 }}
        >
          🖱️ Nav
        </div>
      </div>

      {/* Hold-to-switch progress */}
      {holdProgress > 0 && holdTarget && (() => {
        const style = MODE_STYLE[holdTarget];
        return (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <ProgressRing progress={holdProgress} color={style.color} emoji={style.emoji} />
            <span className={`text-xs ${style.textClass} bg-gray-900/80 px-2 py-0.5 rounded`}>
              Switch to {style.label}
            </span>
          </div>
        );
      })()}
    </div>
  );
}

/* ── Small helper for the circular progress ring ────────── */
function ProgressRing({ progress, color, emoji }: { progress: number; color: string; emoji: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#374151" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          className="transition-all duration-100"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg">{emoji}</span>
    </div>
  );
}
