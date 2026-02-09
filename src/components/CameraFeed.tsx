"use client";

import { useRef } from "react";

interface CameraFeedProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    isTracking: boolean;
    className?: string;
}

export default function CameraFeed({
    videoRef,
    canvasRef,
    isTracking,
    className = "",
}: CameraFeedProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden rounded-xl bg-gray-900 ${className}`}
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
                className="absolute inset-0 w-full h-full object-contain"
            />

            {/* Status indicator */}
            {!isTracking && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-white text-lg font-medium">
                            Starting camera...
                        </p>
                    </div>
                </div>
            )}

            {/* Corner frame guides */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-green-400 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-green-400 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-green-400 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-green-400 rounded-br-lg" />
        </div>
    );
}
