"use client";

import type { TranslationEntry } from "@/types";

interface TranslationDisplayProps {
    currentTranslation: string | null;
    confidence: number | null;
    transcript: TranslationEntry[];
    language: "en" | "fil";
    spellingWord?: string | null;
    spellingLetters?: string[];
}

export default function TranslationDisplay({
    currentTranslation,
    confidence,
    transcript,
    spellingWord,
    spellingLetters,
}: TranslationDisplayProps) {
    const isSpelling = spellingWord && spellingLetters && spellingLetters.length > 0;

    return (
        <div className="flex flex-col h-full">
            {/* Current translation — large prominent text */}
            <div className="flex-1 flex items-center justify-center px-6">
                {isSpelling ? (
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-wider text-cyan-400 mb-2">
                            Spelling
                        </p>
                        <div className="flex items-center justify-center gap-1 flex-wrap mb-3">
                            {spellingLetters.map((letter, i) => (
                                <span
                                    key={`${i}-${letter}`}
                                    className="inline-flex items-center justify-center w-10 h-12 bg-cyan-500/10 border border-cyan-400/30 rounded-md text-xl font-bold text-th-fg"
                                >
                                    {letter}
                                </span>
                            ))}
                            <span className="w-0.5 h-10 bg-cyan-400 rounded-full animate-pulse" />
                        </div>
                        <p className="text-4xl md:text-5xl font-bold text-th-fg">
                            {spellingWord}
                        </p>
                    </div>
                ) : currentTranslation ? (
                    <div className="text-center">
                        <p className="text-5xl md:text-6xl font-bold text-th-fg leading-tight">
                            {currentTranslation}
                        </p>
                        {confidence !== null && (
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <div className="w-32 h-2 bg-th-surface-3 rounded-full overflow-hidden">
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
                                <span className="text-sm text-th-text-3">
                                    {Math.round(confidence * 100)}%
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-2xl text-th-text-4 italic">
                        Show a sign to begin...
                    </p>
                )}
            </div>

            {/* Scrolling transcript */}
            <div className="border-t border-th-border px-4 py-3 max-h-40 overflow-y-auto">
                <h3 className="text-xs uppercase tracking-wider text-th-text-4 mb-2">
                    Conversation Log
                </h3>
                {transcript.length === 0 ? (
                    <p className="text-sm text-th-text-5">No translations yet.</p>
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
                                    <span className="text-th-text-2">{entry.text}</span>
                                    <span className="text-th-text-5 text-xs ml-auto">
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
