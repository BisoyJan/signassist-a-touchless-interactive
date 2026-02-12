"use client";

import { useRef } from "react";

interface CameraFeedProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    isTracking: boolean;
    cameraEnabled?: boolean;
    onToggleCamera?: () => void;
    className?: string;
}

export default function CameraFeed({
    videoRef,
    canvasRef,
    isTracking,
    cameraEnabled = true,
    onToggleCamera,
    className = "",
}: CameraFeedProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden rounded-xl bg-th-surface ${className}`}
        >
            {/* Hidden video element — only used as a webcam source */}
            <video
                ref={videoRef}
                className="absolute opacity-0 pointer-events-none"
                autoPlay
                playsInline
                muted
            />

            {/* Canvas renders mirrored video frame + landmark overlay */}
            <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full object-contain ${!cameraEnabled ? "hidden" : ""}`}
            />

            {/* Camera off overlay */}
            {!cameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-th-surface">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📷</div>
                        <p className="text-th-text-3 text-lg font-medium">
                            Camera is turned off
                        </p>
                        <p className="text-th-text-5 text-sm mt-1">
                            Click the button below to turn it back on
                        </p>
                    </div>
                </div>
            )}

            {/* Status indicator — loading */}
            {cameraEnabled && !isTracking && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-th-fg text-lg font-medium">
                            Starting camera...
                        </p>
                    </div>
                </div>
            )}

            {/* Corner frame guides */}
            {cameraEnabled && (
                <>
                    <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-green-400 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-green-400 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-green-400 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-green-400 rounded-br-lg" />
                </>
            )}


            {/* Camera on/off toggle button */}
            {onToggleCamera && (
                <button
                    onClick={onToggleCamera}
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg font-medium text-sm transition-colors border ${cameraEnabled
                            ? "bg-red-600/80 hover:bg-red-600 border-red-500 text-white"
                            : "bg-green-600/80 hover:bg-green-600 border-green-500 text-white"
                        }`}
                    data-hand-nav
                >
                    {cameraEnabled ? "⏹ Turn Off Camera" : "▶ Turn On Camera"}
                </button>
            )}
        </div>
    );
}
