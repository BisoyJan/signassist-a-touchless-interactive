// ============================================================
// SignAssist — Core Type Definitions
// ============================================================

/** Interaction mode: motion-trained model, spelling, or hand navigation. */
export type InteractionMode = "sign" | "spelling" | "navigate";

/** A single hand landmark (21 per hand, from MediaPipe). */
export interface Landmark {
    x: number;
    y: number;
    z: number;
}

/** Recognised hand data for a single frame. */
export interface HandFrame {
    landmarks: Landmark[];
    handedness: "Left" | "Right";
    timestamp: number;
}

/** A fixed-length sequence of landmark vectors fed to the LSTM. */
export interface LandmarkSequence {
    /** Flat array: frames × 63 features (21 landmarks × 3 coords). */
    data: number[][];
    /** Number of frames in the sequence. */
    length: number;
}

/** Result from the gesture classifier. */
export interface GestureResult {
    /** Predicted sign label (e.g. "thank_you", "pressure_light"). */
    label: string;
    /** Confidence score 0-1. */
    confidence: number;
    /** Classification source. */
    source: "lstm";
}

/** A single entry in the conversation transcript. */
export interface TranslationEntry {
    id: string;
    sign: string;
    text: string;
    language: "en" | "fil";
    timestamp: number;
    confirmed: boolean;
}

/** System-wide state for the kiosk. */
export type SystemStatus =
    | "initializing"
    | "ready"
    | "detecting"
    | "translating"
    | "confirming"
    | "speaking"
    | "error";

/** Domain-specific sign vocabulary item. */
export interface SignVocabularyItem {
    id: string;
    label: string;
    textEn: string;
    textFil: string;
    category: "greeting" | "body_part" | "service" | "duration" | "feedback" | "general" | "letter" | "mode";
}

/** Configuration for the SignAssist system. */
export interface SignAssistConfig {
    /** Minimum confidence to accept a gesture prediction. */
    confidenceThreshold: number;
    /** Number of frames in the landmark sequence buffer. */
    sequenceLength: number;
    /** Seconds to wait before auto-confirming a translation. */
    confirmationDelay: number;
    /** Current display language. */
    language: "en" | "fil";
    /** TTS speech rate (0.1 – 2.0). */
    speechRate: number;
    /** Minimum hand detection confidence for MediaPipe. */
    handDetectionConfidence: number;
    /** Minimum hand tracking confidence for MediaPipe. */
    handTrackingConfidence: number;
}

/** Data collection sample for training. */
export interface TrainingSample {
    label: string;
    landmarks: number[][];
    signer: string;
    timestamp: number;
    lighting: "bright" | "dim" | "mixed";
}
