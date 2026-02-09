"use client";

interface SpeakingIndicatorProps {
    isSpeaking: boolean;
}

export default function SpeakingIndicator({ isSpeaking }: SpeakingIndicatorProps) {
    if (!isSpeaking) return null;

    return (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-cyan-500/20 border border-cyan-400/30 rounded-full px-5 py-2.5 backdrop-blur-sm">
            {/* Animated waveform */}
            <div className="flex items-center gap-0.5 h-6">
                {[3, 5, 7, 5, 8, 4, 6, 3, 5, 7].map((height, i) => (
                    <div
                        key={i}
                        className="w-1 bg-cyan-400 rounded-full"
                        // Dynamic animation delay and height for waveform effect
                        style={{
                            animation: `wave 0.8s ease-in-out infinite`,
                            animationDelay: `${i * 0.08}s`,
                            height: `${height * 2}px`,
                        }}
                    />
                ))}
            </div>
            <span className="text-cyan-300 text-sm font-medium">Speaking...</span>

            <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.2); }
        }
      `}</style>
        </div>
    );
}
