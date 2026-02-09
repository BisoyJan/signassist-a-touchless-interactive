"use client";

import type { TranslationEntry } from "@/types";

interface TranslationDisplayProps {
    currentTranslation: string | null;
    confidence: number | null;
    transcript: TranslationEntry[];
    language: "en" | "fil";
}

export default function TranslationDisplay({
    currentTranslation,
    confidence,
    transcript,
}: TranslationDisplayProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Current translation — large prominent text */}
            <div className="flex-1 flex items-center justify-center px-6">
                {currentTranslation ? (
                    <div className="text-center">
                        <p className="text-5xl md:text-6xl font-bold text-white leading-tight">
                            {currentTranslation}
                        </p>
                        {confidence !== null && (
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        // Dynamic width and color based on confidence score
                                        style={{
                                            width: `${confidence * 100}%`,
                                            backgroundColor:
                                                confidence > 0.85
                                                    ? "#22c55e"
                                                    : confidence > 0.7
                                                        ? "#eab308"
                                                        : "#ef4444",
                                        }}
                                    />
                                </div>
                                <span className="text-sm text-gray-400">
                                    {Math.round(confidence * 100)}%
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-2xl text-gray-500 italic">
                        Show a sign to begin...
                    </p>
                )}
            </div>

            {/* Scrolling transcript */}
            <div className="border-t border-gray-700 px-4 py-3 max-h-40 overflow-y-auto">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                    Conversation Log
                </h3>
                {transcript.length === 0 ? (
                    <p className="text-sm text-gray-600">No translations yet.</p>
                ) : (
                    <div className="space-y-1">
                        {transcript
                            .slice(-8)
                            .reverse()
                            .map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${entry.confirmed ? "bg-green-400" : "bg-yellow-400"
                                            }`}
                                    />
                                    <span className="text-gray-300">{entry.text}</span>
                                    <span className="text-gray-600 text-xs ml-auto">
                                        {new Date(entry.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
