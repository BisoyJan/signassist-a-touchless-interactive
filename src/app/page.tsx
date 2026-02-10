"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useHandTracker, useGestureClassifier, useSpeechOutput, useWordBuilder, useHandNavigation, useModeSwitcher } from "@/hooks";
import {
  CameraFeed,
  TranslationDisplay,
  ConfirmationPanel,
  StatusBar,
  SpeakingIndicator,
  SpellingDisplay,
  HandCursor,
} from "@/components";
import { getTranslation, DEFAULT_CONFIG } from "@/config";
import type { SystemStatus, TranslationEntry, HandFrame } from "@/types";

export default function KioskPage() {
  // ── Refs ──────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const classifyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spellingNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const letterStreakRef = useRef({ label: "", count: 0, lastTime: 0 });

  // ── State ─────────────────────────────────────────────────
  const [status, setStatus] = useState<SystemStatus>("initializing");
  const [language, setLanguage] = useState<"en" | "fil">(
    DEFAULT_CONFIG.language
  );
  const [transcript, setTranscript] = useState<TranslationEntry[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState<string | null>(
    null
  );
  const [confidence, setConfidence] = useState<number | null>(null);
  const [spellingNotice, setSpellingNotice] = useState<string | null>(null);

  // ── Hooks ─────────────────────────────────────────────────
  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
  } = useSpeechOutput({
    language,
    rate: DEFAULT_CONFIG.speechRate,
    onStart: () => setStatus("speaking"),
    onEnd: () => setStatus("ready"),
  });

  // ── Word builder (letter → word) ─────────────────────────
  const onWordComplete = useCallback(
    (word: string) => {
      setCurrentTranslation(word);
      setConfidence(null);
      setPendingText(word);
      setPendingLabel(`spelled:${word}`);
      setStatus("confirming");
    },
    []
  );

  const {
    letters: spellingLetters,
    isSpelling,
    countdown: spellingCountdown,
    addLetter,
    deleteLast: deleteLastLetter,
    finalizeWord,
    cancelWord,
  } = useWordBuilder({ onWordComplete });

  // ── Mode switcher (3 modes: sign / spelling / navigate) ──
  const { mode, setModeManual, checkModeGesture, holdProgress, isHolding, holdTarget } = useModeSwitcher();

  const onGestureDetected = useCallback(
    (result: { label: string; confidence: number; source: string }) => {
      // ── Mode-switching gestures (from LSTM) ─────────────
      if (result.label === "mode_navigate") {
        if (mode !== "navigate") setModeManual("navigate");
        return;
      }
      if (result.label === "mode_spelling") {
        if (mode !== "spelling") setModeManual("spelling");
        return;
      }
      if (result.label === "mode_sign") {
        if (mode !== "sign") setModeManual("sign");
        return;
      }

      // ── Letters are only handled in spelling mode ───────
      if (result.label.startsWith("letter_")) {
        if (mode === "spelling") {
          const SPELLING_CONFIDENCE_THRESHOLD = 0.75;
          const LETTER_STREAK_REQUIRED = 3;
          const LETTER_STREAK_WINDOW_MS = 900;

          if (result.confidence < SPELLING_CONFIDENCE_THRESHOLD) {
            setSpellingNotice("Hold the letter steady for clearer detection.");
            return;
          }

          const now = Date.now();
          const streak = letterStreakRef.current;
          if (result.label === streak.label && now - streak.lastTime <= LETTER_STREAK_WINDOW_MS) {
            streak.count += 1;
          } else {
            streak.label = result.label;
            streak.count = 1;
          }
          streak.lastTime = now;

          if (streak.count >= LETTER_STREAK_REQUIRED) {
            streak.label = "";
            streak.count = 0;
            addLetter(result.label);
          }
        }
        return;
      }

      if (result.label === "unknown") {
        if (mode === "spelling") {
          setSpellingNotice("No clear letter detected.");
        } else if (mode === "sign") {
          setCurrentTranslation("Unknown sign");
          setConfidence(result.confidence);
        }
        return;
      }

      // In spelling mode, ignore non-letter gestures
      if (mode === "spelling") {
        setSpellingNotice("Spelling mode accepts letters only.");
        return;
      }

      // Non-letter gesture → show confirmation (works in both sign & spelling modes)
      const text = getTranslation(result.label, language);
      setCurrentTranslation(text);
      setConfidence(result.confidence);
      setPendingText(text);
      setPendingLabel(result.label);
      setStatus("confirming");
    },
    [language, addLetter, mode, setModeManual]
  );

  const {
    loadModel,
    pushFrame,
    classify,
    isModelLoaded,
    modelError,
    modelInfo,
  } = useGestureClassifier({
    sequenceLength: DEFAULT_CONFIG.sequenceLength,
    confidenceThreshold: DEFAULT_CONFIG.confidenceThreshold,
    onGestureDetected,
  });

  // ── Hand navigation (touchless cursor + pinch click) ────
  const { cursor, cursorDomRef, updateFromHands: updateNav } = useHandNavigation();

  // Cancel any in-progress spelling when leaving spelling mode
  useEffect(() => {
    if (mode !== "spelling" && isSpelling) {
      cancelWord();
    }
  }, [mode, isSpelling, cancelWord]);

  useEffect(() => {
    if (mode !== "spelling") {
      setSpellingNotice(null);
      letterStreakRef.current = { label: "", count: 0, lastTime: 0 };
    }
  }, [mode]);

  useEffect(() => {
    if (!spellingNotice) return;
    if (spellingNoticeTimerRef.current) {
      clearTimeout(spellingNoticeTimerRef.current);
    }
    spellingNoticeTimerRef.current = setTimeout(() => {
      setSpellingNotice(null);
    }, 1200);
  }, [spellingNotice]);

  const onHandResults = useCallback(
    (hands: HandFrame[]) => {
      // Always check for heuristic mode-switch gestures (fallback)
      checkModeGesture(hands);

      // Always feed frames to the LSTM buffer so it can detect mode gestures
      // even while navigating or spelling.
      // NOTE: Always call pushFrame — even with empty hands — so the buffer
      // can be cleared after a gap (noHandCount logic inside pushFrame).
      pushFrame(hands);

      // In navigate mode → update cursor
      if (mode === "navigate") {
        updateNav(hands, true);
        if (status !== "confirming" && status !== "speaking") {
          setStatus(hands.length > 0 ? "detecting" : "ready");
        }
        return;
      }

      // In sign or spelling mode → hide cursor
      updateNav([], false);

      if (status === "confirming" || status === "speaking") return;

      // Suppress classification while any mode-switch gesture is being held
      if (isHolding) return;

      // During spelling, stay in "detecting" so the classifier keeps running
      setStatus(hands.length > 0 ? "detecting" : (isSpelling ? "detecting" : "ready"));
    },
    [pushFrame, status, isSpelling, updateNav, mode, checkModeGesture, isHolding]
  );

  const {
    initialize: initHandTracker,
    startTracking,
    isLoading: isHandTrackerLoading,
    isTracking,
    error: handTrackerError,
  } = useHandTracker({
    onResults: onHandResults,
    minDetectionConfidence: DEFAULT_CONFIG.handDetectionConfidence,
    minTrackingConfidence: DEFAULT_CONFIG.handTrackingConfidence,
  });

  // ── Initialization ────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setStatus("initializing");
      await initHandTracker();
      await loadModel();
      setStatus("ready");
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start tracking once hand tracker is ready
  useEffect(() => {
    if (
      !isHandTrackerLoading &&
      !isTracking &&
      videoRef.current &&
      canvasRef.current &&
      status !== "initializing"
    ) {
      startTracking(videoRef.current, canvasRef.current);
    }
  }, [isHandTrackerLoading, isTracking, startTracking, status]);

  // Run classification at regular intervals (all modes — LSTM detects mode gestures too)
  useEffect(() => {
    if (status === "detecting") {
      classifyIntervalRef.current = setInterval(() => {
        classify();
      }, 300);
    } else {
      if (classifyIntervalRef.current) {
        clearInterval(classifyIntervalRef.current);
        classifyIntervalRef.current = null;
      }
    }
    return () => {
      if (classifyIntervalRef.current) {
        clearInterval(classifyIntervalRef.current);
      }
    };
  }, [status, classify]);

  // ── Handlers ──────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!pendingText || !pendingLabel) return;

    const entry: TranslationEntry = {
      id: crypto.randomUUID(),
      sign: pendingLabel,
      text: pendingText,
      language,
      timestamp: Date.now(),
      confirmed: true,
    };

    setTranscript((prev) => [...prev, entry]);
    speak(pendingText);
    setPendingText(null);
    setPendingLabel(null);
  }, [pendingText, pendingLabel, language, speak]);

  const handleCancelConfirmation = useCallback(() => {
    setPendingText(null);
    setPendingLabel(null);
    setCurrentTranslation(null);
    setConfidence(null);
    setStatus("ready");
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "en" ? "fil" : "en"));
    stopSpeaking();
  }, [stopSpeaking]);

  // ── Error state ───────────────────────────────────────────
  if (handTrackerError) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Camera Access Required
          </h1>
          <p className="text-gray-400 mb-6">{handTrackerError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors"
            data-hand-nav
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden select-none">
      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 p-3">
        {/* Camera feed — top/left 60% */}
        <div className="flex-[3] min-h-0">
          <CameraFeed
            videoRef={videoRef}
            canvasRef={canvasRef}
            isTracking={isTracking}
          />
        </div>

        {/* Translation panel — bottom/right 40% */}
        <div className="flex-[2] min-h-0 bg-gray-900/50 rounded-xl border border-gray-800">
          <TranslationDisplay
            currentTranslation={currentTranslation}
            confidence={confidence}
            transcript={transcript}
            language={language}
            spellingWord={isSpelling ? spellingLetters.join("") : null}
            spellingLetters={spellingLetters}
          />
        </div>
      </div>

      {/* Spelling overlay */}
      <SpellingDisplay
        letters={spellingLetters}
        countdown={spellingCountdown}
        isSpelling={isSpelling}
        notice={spellingNotice}
        onFinalize={finalizeWord}
        onCancel={cancelWord}
        onDeleteLast={deleteLastLetter}
      />

      {/* Confirmation overlay */}
      <ConfirmationPanel
        text={pendingText}
        delaySeconds={DEFAULT_CONFIG.confirmationDelay}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirmation}
      />

      {/* Speaking indicator */}
      <SpeakingIndicator isSpeaking={isSpeaking} />

      {/* Hand cursor overlay */}
      <HandCursor cursor={cursor} mode={mode} holdProgress={holdProgress} holdTarget={holdTarget} cursorDomRef={cursorDomRef} />

      {/* Status bar */}
      <StatusBar
        status={status}
        isSpeaking={isSpeaking}
        language={language}
        onToggleLanguage={toggleLanguage}
        isModelLoaded={isModelLoaded}
        modelError={modelError}
        modelInfo={modelInfo}
        mode={mode}
        onToggleMode={setModeManual}
      />
    </div>
  );
}
