"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useHandTracker } from "@/hooks";
import { CameraFeed } from "@/components";
import { SIGN_VOCABULARY, DEFAULT_CONFIG, NUM_HANDS, NUM_LANDMARKS } from "@/config";
import type { HandFrame, TrainingSample } from "@/types";

/**
 * Data Collection Page
 *
 * Use this page to record sign language gesture samples
 * for training the LSTM classifier. Each sample captures
 * a sequence of MediaPipe hand landmarks.
 */
export default function CollectPage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const framesRef = useRef<number[][]>([]);

    const [selectedSign, setSelectedSign] = useState(SIGN_VOCABULARY[0].label);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [signerName, setSignerName] = useState("");
    const [lighting, setLighting] = useState<"bright" | "dim" | "mixed">("bright");

    const categories = ["all", ...Array.from(new Set(SIGN_VOCABULARY.map((s) => s.category)))];
    const filteredVocabulary = categoryFilter === "all"
        ? SIGN_VOCABULARY
        : SIGN_VOCABULARY.filter((s) => s.category === categoryFilter);
    const [isRecording, setIsRecording] = useState(false);
    const [samples, setSamples] = useState<TrainingSample[]>([]);
    const [frameCount, setFrameCount] = useState(0);
    const [handsDetected, setHandsDetected] = useState(0);
    const [sequenceLength, setSequenceLength] = useState(DEFAULT_CONFIG.sequenceLength);

    // Auto-record batch state
    const [targetSamples, setTargetSamples] = useState(5);
    const [delayBetween, setDelayBetween] = useState(3);
    const [autoRecordProgress, setAutoRecordProgress] = useState(0);
    const [isAutoRecording, setIsAutoRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const autoRecordRef = useRef({ active: false, target: 0, current: 0 });
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const onHandResults = useCallback(
        (hands: HandFrame[]) => {
            if (!isRecording || hands.length === 0) return;

            // Track how many hands are visible for the UI
            setHandsDetected(hands.length);

            // Build a 126-feature vector: hand1 (63) + hand2 (63)
            // If only one hand detected, zero-pad the second hand.
            const FEATS_PER_HAND = NUM_LANDMARKS * 3; // 63
            const features: number[] = new Array(NUM_HANDS * FEATS_PER_HAND).fill(0);

            for (let h = 0; h < Math.min(hands.length, NUM_HANDS); h++) {
                const offset = h * FEATS_PER_HAND;
                for (let i = 0; i < hands[h].landmarks.length; i++) {
                    features[offset + i * 3] = hands[h].landmarks[i].x;
                    features[offset + i * 3 + 1] = hands[h].landmarks[i].y;
                    features[offset + i * 3 + 2] = hands[h].landmarks[i].z;
                }
            }

            framesRef.current.push(features);
            setFrameCount(framesRef.current.length);

            // Auto-stop when we have enough frames
            if (framesRef.current.length >= sequenceLength) {
                const sample: TrainingSample = {
                    label: selectedSign,
                    landmarks: framesRef.current.slice(0, sequenceLength),
                    signer: signerName || "unknown",
                    timestamp: Date.now(),
                    lighting,
                };
                setSamples((prev) => [...prev, sample]);
                framesRef.current = [];
                setFrameCount(0);
                setIsRecording(false);

                // Auto-record: check if we need more samples
                const ref = autoRecordRef.current;
                if (ref.active) {
                    ref.current += 1;
                    setAutoRecordProgress(ref.current);
                    if (ref.current >= ref.target) {
                        // Batch complete
                        ref.active = false;
                        setIsAutoRecording(false);
                    }
                }
            }
        },
        [isRecording, selectedSign, signerName, lighting, sequenceLength]
    );

    const {
        initialize: initHandTracker,
        startTracking,
        stopTracking,
        isLoading,
        isTracking,
        error,
    } = useHandTracker({
        onResults: onHandResults,
    });

    const toggleCamera = useCallback(() => {
        if (cameraEnabled) {
            stopTracking();
            setCameraEnabled(false);
            if (isRecording) {
                setIsRecording(false);
                framesRef.current = [];
                setFrameCount(0);
            }
            if (isAutoRecording) {
                cancelAutoRecording();
            }
        } else {
            setCameraEnabled(true);
            // startTracking re-initializes MediaPipe if needed
            if (videoRef.current && canvasRef.current) {
                startTracking(videoRef.current, canvasRef.current);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraEnabled, stopTracking, startTracking, isRecording, isAutoRecording]);

    useEffect(() => {
        initHandTracker();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (cameraEnabled && !isLoading && !isTracking && videoRef.current && canvasRef.current) {
            startTracking(videoRef.current, canvasRef.current);
        }
    }, [isLoading, isTracking, startTracking, cameraEnabled]);

    const startRecording = () => {
        framesRef.current = [];
        setFrameCount(0);
        setIsRecording(true);
    };

    const startAutoRecording = () => {
        autoRecordRef.current = { active: true, target: targetSamples, current: 0 };
        setAutoRecordProgress(0);
        setIsAutoRecording(true);
        setIsPaused(false);
        startRecording();
    };

    const pauseAutoRecording = () => {
        autoRecordRef.current.active = false;
        setIsPaused(true);
        setIsRecording(false);
        setCountdown(0);
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        framesRef.current = [];
        setFrameCount(0);
    };

    const resumeAutoRecording = () => {
        autoRecordRef.current.active = true;
        setIsPaused(false);
        startRecording();
    };

    const cancelAutoRecording = () => {
        autoRecordRef.current.active = false;
        setIsAutoRecording(false);
        setIsPaused(false);
        setIsRecording(false);
        setCountdown(0);
        setAutoRecordProgress(0);
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        framesRef.current = [];
        setFrameCount(0);
    };

    // Auto-start the next recording after adjustable countdown
    useEffect(() => {
        if (!isAutoRecording || isRecording || countdown > 0) return;
        const ref = autoRecordRef.current;
        if (!ref.active || ref.current >= ref.target) return;

        // If delay is 0, start immediately
        if (delayBetween === 0) {
            startRecording();
            return;
        }

        // Start countdown before next sample
        setCountdown(delayBetween);
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    countdownTimerRef.current = null;
                    // Start the next recording
                    startRecording();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        countdownTimerRef.current = timer;

        return () => {
            clearInterval(timer);
            countdownTimerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAutoRecording, isRecording]);

    const downloadSamples = () => {
        const blob = new Blob([JSON.stringify(samples, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `signassist_samples_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Group samples by sign label
    const sampleCounts = samples.reduce<Record<string, number>>((acc, s) => {
        acc[s.label] = (acc[s.label] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-th-bg text-th-fg p-6 cursor-default">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">
                    📹 SignAssist — Data Collection
                </h1>
                <p className="text-th-text-3 mb-6">
                    Record sign language gesture samples for training the LSTM model. Each
                    recording captures {sequenceLength} frames of hand landmarks.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Camera */}
                    <div className="lg:col-span-2">
                        <div className="aspect-video">
                            <CameraFeed
                                videoRef={videoRef}
                                canvasRef={canvasRef}
                                isTracking={isTracking}
                                cameraEnabled={cameraEnabled}
                                onToggleCamera={toggleCamera}
                            />
                        </div>
                        {/* Auto-record batch progress */}
                        {isAutoRecording && (
                            <div className={`mt-3 rounded-lg p-3 border ${isPaused ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`font-medium text-sm ${isPaused ? 'text-yellow-600 dark:text-yellow-300' : 'text-blue-600 dark:text-blue-300'}`}>
                                        {isPaused ? '⏸ Paused' : '🔄 Auto-Recording'}: {autoRecordProgress} / {targetSamples} samples
                                    </span>
                                    <div className="flex gap-2">
                                        {isPaused ? (
                                            <button
                                                onClick={resumeAutoRecording}
                                                className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-500 transition-colors"
                                            >
                                                ▶ Resume
                                            </button>
                                        ) : (
                                            <button
                                                onClick={pauseAutoRecording}
                                                className="px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-500 transition-colors"
                                            >
                                                ⏸ Pause
                                            </button>
                                        )}
                                        <button
                                            onClick={cancelAutoRecording}
                                            className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-500 transition-colors"
                                        >
                                            ✕ Cancel
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-th-surface-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all"
                                        style={{
                                            width: `${(autoRecordProgress / targetSamples) * 100}%`,
                                        }}
                                    />
                                </div>
                                {countdown > 0 && !isRecording && (
                                    <div className="mt-2 text-center">
                                        <span className="text-yellow-600 dark:text-yellow-300 text-2xl font-bold animate-pulse">
                                            Next sample in {countdown}...
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {isRecording && (
                            <div className="mt-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-red-400 font-medium">Recording...</span>
                                    <span className="text-th-text-3 text-sm">
                                        {frameCount} / {sequenceLength} frames
                                    </span>
                                    <span className={`text-sm font-medium ${handsDetected >= 2 ? "text-green-400" : "text-yellow-400"}`}>
                                        ✋×{handsDetected}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-th-surface-2 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-red-500 rounded-full transition-all"
                                        // Dynamic width based on recording progress
                                        style={{
                                            width: `${(frameCount / sequenceLength) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                        {/* Category filter */}
                        <div>
                            <label className="block text-sm text-th-text-3 mb-1">
                                Category
                            </label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => {
                                    setCategoryFilter(e.target.value);
                                    const filtered = e.target.value === "all"
                                        ? SIGN_VOCABULARY
                                        : SIGN_VOCABULARY.filter((s) => s.category === e.target.value);
                                    if (filtered.length > 0) setSelectedSign(filtered[0].label);
                                }}
                                className="w-full bg-th-surface-2 border border-th-border rounded-lg px-3 py-2 text-th-fg"
                                disabled={isRecording}
                                aria-label="Filter signs by category"
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c === "all" ? "All Categories" : c.replace("_", " ")}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sign selector */}
                        <div>
                            <label className="block text-sm text-th-text-3 mb-1">
                                Sign Label
                            </label>
                            <select
                                value={selectedSign}
                                onChange={(e) => setSelectedSign(e.target.value)}
                                className="w-full bg-th-surface-2 border border-th-border rounded-lg px-3 py-2 text-th-fg"
                                disabled={isRecording}
                                aria-label="Select sign label to record"
                            >
                                {filteredVocabulary.map((s) => (
                                    <option key={s.id} value={s.label}>
                                        {s.textEn} ({s.textFil}) — {s.category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Signer name */}
                        <div>
                            <label className="block text-sm text-th-text-3 mb-1">
                                Signer Name
                            </label>
                            <input
                                type="text"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                placeholder="e.g., Maria"
                                className="w-full bg-th-surface-2 border border-th-border rounded-lg px-3 py-2 text-th-fg"
                                disabled={isRecording}
                            />
                        </div>

                        {/* Frames per sample */}
                        <div>
                            <label className="block text-sm text-th-text-3 mb-1">
                                Frames per Sample: <span className="text-th-fg font-medium">{sequenceLength}</span>
                                <span className="text-th-text-4 ml-1">(≈{(sequenceLength / 30).toFixed(1)}s)</span>
                            </label>
                            <input
                                type="range"
                                min={15}
                                max={120}
                                step={5}
                                value={sequenceLength}
                                onChange={(e) => setSequenceLength(Number(e.target.value))}
                                className="w-full accent-green-500"
                                disabled={isRecording}
                                aria-label="Frames per sample"
                            />
                            <div className="flex justify-between text-xs text-th-text-5 mt-0.5">
                                <span>15 (0.5s)</span>
                                <span>30 (1s)</span>
                                <span>60 (2s)</span>
                                <span>120 (4s)</span>
                            </div>
                        </div>

                        {/* Lighting condition */}
                        <div>
                            <label className="block text-sm text-th-text-3 mb-1">
                                Lighting
                            </label>
                            <div className="flex gap-2">
                                {(["bright", "dim", "mixed"] as const).map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => setLighting(l)}
                                        disabled={isRecording}
                                        className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${lighting === l
                                            ? "bg-green-600 border-green-500 text-white"
                                            : "bg-th-surface-2 border-th-border text-th-text-3 hover:border-th-border-2"
                                            }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Delay between samples */}
                        <div>
                            <label className="block text-sm text-th-text-3 mb-1">
                                Delay Between Samples: <span className="text-th-fg font-medium">{delayBetween}s</span>
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={10}
                                step={1}
                                value={delayBetween}
                                onChange={(e) => setDelayBetween(Number(e.target.value))}
                                className="w-full accent-green-500"
                                disabled={isRecording || isAutoRecording}
                                aria-label="Delay between samples in seconds"
                            />
                            <div className="flex justify-between text-xs text-th-text-5 mt-0.5">
                                <span>0s (instant)</span>
                                <span>5s</span>
                                <span>10s</span>
                            </div>
                        </div>

                        {/* Number of samples to auto-record */}
                        <div>
                            <label className="block text-sm text-th-text-3 mb-1">
                                Samples to Record: <span className="text-th-fg font-medium">{targetSamples}</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={400}
                                value={targetSamples}
                                onChange={(e) => setTargetSamples(Math.max(1, Math.min(400, Number(e.target.value) || 1)))}
                                className="w-full bg-th-surface-2 border border-th-border rounded-lg px-3 py-2 text-th-fg"
                                disabled={isRecording || isAutoRecording}
                                aria-label="Number of samples to auto-record"
                            />
                        </div>

                        {/* Record buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={startRecording}
                                disabled={isRecording || isAutoRecording || !isTracking}
                                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${isRecording || isAutoRecording
                                    ? "bg-th-surface-3 text-th-text-3 cursor-not-allowed"
                                    : "bg-th-surface-3 text-th-fg hover:bg-th-surface-2 border border-th-border-2"
                                    }`}
                            >
                                ▶ Record 1
                            </button>
                            <button
                                onClick={isAutoRecording ? (isPaused ? resumeAutoRecording : pauseAutoRecording) : startAutoRecording}
                                disabled={(!isAutoRecording && (isRecording || !isTracking))}
                                className={`flex-[2] py-3 rounded-lg font-bold text-sm transition-colors ${isAutoRecording && isPaused
                                        ? "bg-green-600 text-white hover:bg-green-500"
                                        : isAutoRecording
                                            ? "bg-yellow-600 text-white hover:bg-yellow-500"
                                            : isRecording || !isTracking
                                                ? "bg-green-800 text-green-300 cursor-not-allowed"
                                                : "bg-green-600 text-white hover:bg-green-500"
                                    }`}
                            >
                                {isAutoRecording && isPaused
                                    ? `▶ Resume (${autoRecordProgress}/${targetSamples})`
                                    : isAutoRecording
                                        ? `⏸ Pause (${autoRecordProgress}/${targetSamples})`
                                        : `🔄 Auto-Record ${targetSamples} Samples`}
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="bg-th-surface rounded-lg p-4 border border-th-border">
                            <h3 className="text-sm font-medium text-th-text-3 mb-2">
                                Collected Samples ({samples.length} total)
                            </h3>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {Object.entries(sampleCounts).map(([label, count]) => (
                                    <div
                                        key={label}
                                        className="flex justify-between text-sm"
                                    >
                                        <span className="text-th-text-2">{label}</span>
                                        <span className="text-green-400">{count}</span>
                                    </div>
                                ))}
                                {samples.length === 0 && (
                                    <p className="text-xs text-th-text-5">
                                        No samples recorded yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Download */}
                        <button
                            onClick={downloadSamples}
                            disabled={samples.length === 0}
                            className="w-full py-2 rounded-lg border border-th-border text-th-text-2 hover:bg-th-surface-2 transition-colors disabled:opacity-30"
                        >
                            💾 Download Samples ({samples.length})
                        </button>

                        {error && (
                            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
