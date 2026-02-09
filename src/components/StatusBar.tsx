"use client";

import type { SystemStatus } from "@/types";

interface StatusBarProps {
    status: SystemStatus;
    isSpeaking: boolean;
    language: "en" | "fil";
    onToggleLanguage: () => void;
    isModelLoaded: boolean;
    modelError: string | null;
    modelInfo: string | null;
}

const STATUS_LABELS: Record<SystemStatus, { text: string; color: string }> = {
    initializing: { text: "Initializing...", color: "text-yellow-400" },
    ready: { text: "Ready — Show a sign", color: "text-green-400" },
    detecting: { text: "Hand detected", color: "text-blue-400" },
    translating: { text: "Translating...", color: "text-purple-400" },
    confirming: { text: "Confirming...", color: "text-yellow-400" },
    speaking: { text: "Speaking...", color: "text-cyan-400" },
    error: { text: "Error", color: "text-red-400" },
};

export default function StatusBar({
    status,
    isSpeaking,
    language,
    onToggleLanguage,
    isModelLoaded,
    modelError,
    modelInfo,
}: StatusBarProps) {
    const statusInfo = STATUS_LABELS[status];

    return (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-900/80 border-t border-gray-700/50">
            {/* Left: System status */}
            <div className="flex items-center gap-3">
                <div
                    className={`w-3 h-3 rounded-full ${status === "error"
                            ? "bg-red-500"
                            : status === "ready"
                                ? "bg-green-500 animate-pulse"
                                : "bg-yellow-500 animate-pulse"
                        }`}
                />
                <span className={`text-sm font-medium ${statusInfo.color}`}>
                    {statusInfo.text}
                </span>

                {/* Speaking indicator */}
                {isSpeaking && (
                    <div className="flex items-center gap-1 ml-2">
                        <div className="flex gap-0.5 items-end h-4">
                            {[1, 2, 3, 4, 3].map((h, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-cyan-400 rounded-full animate-pulse"
                                    // Dynamic height and animation delay
                                    style={{
                                        height: `${h * 4}px`,
                                        animationDelay: `${i * 0.1}s`,
                                    }}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-cyan-400 ml-1">Audio</span>
                    </div>
                )}
            </div>

            {/* Center: Model status */}
            <div className="text-xs text-gray-500">
                {isModelLoaded ? (
                    <span className="text-green-500" title={modelInfo ?? undefined}>● Model loaded{modelInfo ? ` (${modelInfo})` : ""}</span>
                ) : modelError ? (
                    <span className="text-yellow-500">⚠ Demo mode</span>
                ) : (
                    <span className="text-gray-500">Loading model...</span>
                )}
            </div>

            {/* Right: Language toggle + branding */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleLanguage}
                    className="px-3 py-1 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white hover:bg-gray-700 transition-colors"
                >
                    {language === "en" ? "🇺🇸 EN" : "🇵🇭 FIL"}
                </button>
                <span className="text-xs text-gray-600 font-mono">SignAssist v1.0</span>
            </div>
        </div>
    );
}
