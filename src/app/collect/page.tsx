"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useHandTracker } from "@/hooks";
import { CameraFeed } from "@/components";
import { SIGN_VOCABULARY, DEFAULT_CONFIG } from "@/config";
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

    const sequenceLength = DEFAULT_CONFIG.sequenceLength;

    const onHandResults = useCallback(
        (hands: HandFrame[]) => {
            if (!isRecording || hands.length === 0) return;

            const features: number[] = [];
            for (const lm of hands[0].landmarks) {
                features.push(lm.x, lm.y, lm.z);
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
            }
        },
        [isRecording, selectedSign, signerName, lighting, sequenceLength]
    );

    const {
        initialize: initHandTracker,
        startTracking,
        isLoading,
        isTracking,
        error,
    } = useHandTracker({
        onResults: onHandResults,
    });

    useEffect(() => {
        initHandTracker();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isLoading && !isTracking && videoRef.current && canvasRef.current) {
            startTracking(videoRef.current, canvasRef.current);
        }
    }, [isLoading, isTracking, startTracking]);

    const startRecording = () => {
        framesRef.current = [];
        setFrameCount(0);
        setIsRecording(true);
    };

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
        <div className="min-h-screen bg-gray-950 text-white p-6 cursor-default">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">
                    📹 SignAssist — Data Collection
                </h1>
                <p className="text-gray-400 mb-6">
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
                            />
                        </div>
                        {isRecording && (
                            <div className="mt-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-red-400 font-medium">Recording...</span>
                                    <span className="text-gray-400 text-sm">
                                        {frameCount} / {sequenceLength} frames
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
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
                            <label className="block text-sm text-gray-400 mb-1">
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
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
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
                            <label className="block text-sm text-gray-400 mb-1">
                                Sign Label
                            </label>
                            <select
                                value={selectedSign}
                                onChange={(e) => setSelectedSign(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
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
                            <label className="block text-sm text-gray-400 mb-1">
                                Signer Name
                            </label>
                            <input
                                type="text"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                placeholder="e.g., Maria"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                disabled={isRecording}
                            />
                        </div>

                        {/* Lighting condition */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">
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
                                                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                                            }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Record button */}
                        <button
                            onClick={startRecording}
                            disabled={isRecording || !isTracking}
                            className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${isRecording
                                    ? "bg-red-700 text-red-200 cursor-not-allowed"
                                    : "bg-green-600 text-white hover:bg-green-500"
                                }`}
                        >
                            {isRecording ? "⏺ Recording..." : "▶ Start Recording"}
                        </button>

                        {/* Stats */}
                        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                            <h3 className="text-sm font-medium text-gray-400 mb-2">
                                Collected Samples ({samples.length} total)
                            </h3>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {Object.entries(sampleCounts).map(([label, count]) => (
                                    <div
                                        key={label}
                                        className="flex justify-between text-sm"
                                    >
                                        <span className="text-gray-300">{label}</span>
                                        <span className="text-green-400">{count}</span>
                                    </div>
                                ))}
                                {samples.length === 0 && (
                                    <p className="text-xs text-gray-600">
                                        No samples recorded yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Download */}
                        <button
                            onClick={downloadSamples}
                            disabled={samples.length === 0}
                            className="w-full py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-30"
                        >
                            💾 Download Samples ({samples.length})
                        </button>

                        {error && (
                            <p className="text-sm text-red-400 bg-red-900/20 rounded-lg p-3">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
