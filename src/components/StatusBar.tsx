"use client";

import type { SystemStatus, InteractionMode } from "@/types";
import ThemeToggle from "./ThemeToggle";

interface StatusBarProps {
    status: SystemStatus;
    isSpeaking: boolean;
    language: "en" | "fil";
    onToggleLanguage: () => void;
    isModelLoaded: boolean;
    modelError: string | null;
    modelInfo: string | null;
    mode: InteractionMode;
    onToggleMode: (target: InteractionMode) => void;
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
    mode,
    onToggleMode,
}: StatusBarProps) {
    const statusInfo = STATUS_LABELS[status];

    return (
        <div className="flex items-center justify-between px-6 py-3 bg-th-surface/80 border-t border-th-border/50">
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
            <div className="text-xs text-th-text-4">
                {isModelLoaded ? (
                    <span className="text-green-500" title={modelInfo ?? undefined}>● Model loaded{modelInfo ? ` (${modelInfo})` : ""}</span>
                ) : modelError ? (
                    <span className="text-yellow-500">⚠ Demo mode</span>
                ) : (
                    <span className="text-th-text-4">Loading model...</span>
                )}
            </div>

            {/* Right: Mode buttons + Language toggle + branding */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onToggleMode("sign")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${mode === "sign"
                            ? "bg-green-600/30 text-green-300 border-green-500/50"
                            : "bg-th-surface-2/50 text-th-text-3 border-th-border-2/50 hover:bg-th-surface-3/50"
                        }`}
                    data-hand-nav
                    title="Motion-trained model (✊+👍)"
                >
                    ✊👍 Motion
                </button>
                <button
                    onClick={() => onToggleMode("spelling")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${mode === "spelling"
                            ? "bg-sky-600/30 text-sky-300 border-sky-500/50"
                            : "bg-th-surface-2/50 text-th-text-3 border-th-border-2/50 hover:bg-th-surface-3/50"
                        }`}
                    data-hand-nav
                    title="Spelling mode (👍👍)"
                >
                    👍👍 Spelling
                </button>
                <button
                    onClick={() => onToggleMode("navigate")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${mode === "navigate"
                            ? "bg-purple-600/30 text-purple-300 border-purple-500/50"
                            : "bg-th-surface-2/50 text-th-text-3 border-th-border-2/50 hover:bg-th-surface-3/50"
                        }`}
                    data-hand-nav
                    title="Navigation mode (✊✊)"
                >
                    ✊✊ Navigate
                </button>
                <button
                    onClick={onToggleLanguage}
                    className="px-3 py-1 bg-th-surface-2 border border-th-border-2 rounded-lg text-sm text-th-fg hover:bg-th-surface-3 transition-colors"
                    data-hand-nav
                >
                    {language === "en" ? "🇺🇸 EN" : "🇵🇭 FIL"}
                </button>
                <ThemeToggle />
                <span className="text-xs text-th-text-5 font-mono">SignAssist v1.0</span>
            </div>
        </div>
    );
}
