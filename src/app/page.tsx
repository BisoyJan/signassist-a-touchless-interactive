"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useHandTracker, useGestureClassifier, useSpeechOutput } from "@/hooks";
import {
  CameraFeed,
  TranslationDisplay,
  ConfirmationPanel,
  StatusBar,
  SpeakingIndicator,
} from "@/components";
import { getTranslation, DEFAULT_CONFIG } from "@/config";
import type { SystemStatus, TranslationEntry, HandFrame } from "@/types";

export default function KioskPage() {
  // ── Refs ──────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const classifyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const onGestureDetected = useCallback(
    (result: { label: string; confidence: number }) => {
      const text = getTranslation(result.label, language);
      setCurrentTranslation(text);
      setConfidence(result.confidence);
      setPendingText(text);
      setPendingLabel(result.label);
      setStatus("confirming");
    },
    [language]
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

  const onHandResults = useCallback(
    (hands: HandFrame[]) => {
      if (status === "confirming" || status === "speaking") return;
      setStatus(hands.length > 0 ? "detecting" : "ready");
      pushFrame(hands);
    },
    [pushFrame, status]
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

  // Run classification at regular intervals
  useEffect(() => {
    if (status === "detecting") {
      classifyIntervalRef.current = setInterval(() => {
        classify();
      }, 500);
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
          />
        </div>
      </div>

      {/* Confirmation overlay */}
      <ConfirmationPanel
        text={pendingText}
        delaySeconds={DEFAULT_CONFIG.confirmationDelay}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirmation}
      />

      {/* Speaking indicator */}
      <SpeakingIndicator isSpeaking={isSpeaking} />

      {/* Status bar */}
      <StatusBar
        status={status}
        isSpeaking={isSpeaking}
        language={language}
        onToggleLanguage={toggleLanguage}
        isModelLoaded={isModelLoaded}
        modelError={modelError}
        modelInfo={modelInfo}
      />
    </div>
  );
}
