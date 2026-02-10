"use client";

import { useEffect, useState, useCallback } from "react";

interface ConfirmationPanelProps {
    text: string | null;
    delaySeconds: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmationPanel({
    text,
    delaySeconds,
    onConfirm,
    onCancel,
}: ConfirmationPanelProps) {
    const [countdown, setCountdown] = useState(delaySeconds);
    const isVisible = Boolean(text);

    // Reset and start countdown when text changes
    useEffect(() => {
        if (!text) return;

        // Reset countdown using setTimeout to avoid synchronous setState warning
        const resetTimer = setTimeout(() => setCountdown(delaySeconds), 0);

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onConfirm();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearTimeout(resetTimer);
            clearInterval(interval);
        };
    }, [text, delaySeconds, onConfirm]);

    const handleCancel = useCallback(() => {
        onCancel();
    }, [onCancel]);

    if (!isVisible || !text) return null;

    return (
        <div className="fixed inset-x-0 bottom-24 flex justify-center z-50 pointer-events-none">
            <div className="bg-gray-800/95 backdrop-blur-sm border border-green-400/30 rounded-2xl px-8 py-5 shadow-2xl pointer-events-auto max-w-lg text-center">
                {/* Confirmation text */}
                <p className="text-lg text-gray-300 mb-1">Did you sign:</p>
                <p className="text-3xl font-bold text-white mb-4">&quot;{text}&quot;</p>

                {/* Countdown ring */}
                <div className="flex items-center justify-center gap-6">
                    <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                            <circle
                                cx="28"
                                cy="28"
                                r="24"
                                fill="none"
                                stroke="#374151"
                                strokeWidth="4"
                            />
                            <circle
                                cx="28"
                                cy="28"
                                r="24"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 24}
                                strokeDashoffset={
                                    2 * Math.PI * 24 * (1 - countdown / delaySeconds)
                                }
                                className="transition-all duration-1000 ease-linear"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                            {countdown}
                        </span>
                    </div>

                    <button
                        onClick={handleCancel}
                        className="px-5 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                        data-hand-nav
                    >
                        Cancel ✕
                    </button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                    Auto-confirming in {countdown}s — or show{" "}
                    <span className="text-yellow-400">open palm</span> to cancel
                </p>
            </div>
        </div>
    );
}
