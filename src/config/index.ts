import type { SignAssistConfig, SignVocabularyItem } from "@/types";

// ============================================================
// Default system configuration
// ============================================================
export const DEFAULT_CONFIG: SignAssistConfig = {
  confidenceThreshold: 0.45,
  sequenceLength: 30, // 30 frames ≈ 1 second at 30 fps
  confirmationDelay: 2, // seconds
  language: "en",
  speechRate: 0.9,
  handDetectionConfidence: 0.4, // lowered for dim lighting
  handTrackingConfidence: 0.4,
};

// ============================================================
// Domain-specific sign vocabulary for Mother's Touch
// ============================================================
export const SIGN_VOCABULARY: SignVocabularyItem[] = [
  // Greetings
  { id: "hello", label: "hello", textEn: "Hello", textFil: "Kamusta", category: "greeting" },
  { id: "welcome", label: "welcome", textEn: "Welcome", textFil: "Maligayang pagdating", category: "greeting" },
  { id: "thank_you", label: "thank_you", textEn: "Thank you", textFil: "Salamat", category: "greeting" },
  { id: "goodbye", label: "goodbye", textEn: "Goodbye", textFil: "Paalam", category: "greeting" },

  // Body parts
  { id: "head", label: "head", textEn: "Head", textFil: "Ulo", category: "body_part" },
  { id: "neck", label: "neck", textEn: "Neck", textFil: "Leeg", category: "body_part" },
  { id: "shoulder", label: "shoulder", textEn: "Shoulder", textFil: "Balikat", category: "body_part" },
  { id: "back", label: "back", textEn: "Back", textFil: "Likod", category: "body_part" },
  { id: "hand", label: "hand", textEn: "Hand", textFil: "Kamay", category: "body_part" },
  { id: "foot", label: "foot", textEn: "Foot", textFil: "Paa", category: "body_part" },

  // Service terms
  { id: "massage", label: "massage", textEn: "Massage", textFil: "Masahe", category: "service" },
  { id: "oil", label: "oil", textEn: "Oil", textFil: "Langis", category: "service" },
  { id: "pressure_light", label: "pressure_light", textEn: "Light pressure", textFil: "Mahinang diin", category: "service" },
  { id: "pressure_medium", label: "pressure_medium", textEn: "Medium pressure", textFil: "Katamtamang diin", category: "service" },
  { id: "pressure_strong", label: "pressure_strong", textEn: "Strong pressure", textFil: "Malakas na diin", category: "service" },
  { id: "hot", label: "hot", textEn: "Hot", textFil: "Mainit", category: "service" },
  { id: "cold", label: "cold", textEn: "Cold", textFil: "Malamig", category: "service" },

  // Duration
  { id: "30_minutes", label: "30_minutes", textEn: "30 minutes", textFil: "30 minuto", category: "duration" },
  { id: "1_hour", label: "1_hour", textEn: "1 hour", textFil: "1 oras", category: "duration" },
  { id: "how_long", label: "how_long", textEn: "How long?", textFil: "Gaano katagal?", category: "duration" },

  // Feedback
  { id: "pain", label: "pain", textEn: "Pain", textFil: "Masakit", category: "feedback" },
  { id: "good", label: "good", textEn: "Good / Feels good", textFil: "Maganda / Masarap", category: "feedback" },
  { id: "stop", label: "stop", textEn: "Stop", textFil: "Tumigil", category: "feedback" },

  // General
  { id: "yes", label: "yes", textEn: "Yes", textFil: "Oo", category: "general" },
  { id: "no", label: "no", textEn: "No", textFil: "Hindi", category: "general" },
  { id: "wait", label: "wait", textEn: "Please wait", textFil: "Sandali lang", category: "general" },
  { id: "done", label: "done", textEn: "Done / Finished", textFil: "Tapos na", category: "general" },
  { id: "price", label: "price", textEn: "How much?", textFil: "Magkano?", category: "general" },
  { id: "unknown", label: "unknown", textEn: "Unknown", textFil: "Hindi malinaw", category: "general" },

  // Letters (fingerspelling alphabet)
  { id: "letter_a", label: "letter_a", textEn: "A", textFil: "A", category: "letter" },
  { id: "letter_b", label: "letter_b", textEn: "B", textFil: "B", category: "letter" },
  { id: "letter_c", label: "letter_c", textEn: "C", textFil: "C", category: "letter" },
  { id: "letter_d", label: "letter_d", textEn: "D", textFil: "D", category: "letter" },
  { id: "letter_e", label: "letter_e", textEn: "E", textFil: "E", category: "letter" },
  { id: "letter_f", label: "letter_f", textEn: "F", textFil: "F", category: "letter" },
  { id: "letter_g", label: "letter_g", textEn: "G", textFil: "G", category: "letter" },
  { id: "letter_h", label: "letter_h", textEn: "H", textFil: "H", category: "letter" },
  { id: "letter_i", label: "letter_i", textEn: "I", textFil: "I", category: "letter" },
  { id: "letter_j", label: "letter_j", textEn: "J", textFil: "J", category: "letter" },
  { id: "letter_k", label: "letter_k", textEn: "K", textFil: "K", category: "letter" },
  { id: "letter_l", label: "letter_l", textEn: "L", textFil: "L", category: "letter" },
  { id: "letter_m", label: "letter_m", textEn: "M", textFil: "M", category: "letter" },
  { id: "letter_n", label: "letter_n", textEn: "N", textFil: "N", category: "letter" },
  { id: "letter_o", label: "letter_o", textEn: "O", textFil: "O", category: "letter" },
  { id: "letter_p", label: "letter_p", textEn: "P", textFil: "P", category: "letter" },
  { id: "letter_q", label: "letter_q", textEn: "Q", textFil: "Q", category: "letter" },
  { id: "letter_r", label: "letter_r", textEn: "R", textFil: "R", category: "letter" },
  { id: "letter_s", label: "letter_s", textEn: "S", textFil: "S", category: "letter" },
  { id: "letter_t", label: "letter_t", textEn: "T", textFil: "T", category: "letter" },
  { id: "letter_u", label: "letter_u", textEn: "U", textFil: "U", category: "letter" },
  { id: "letter_v", label: "letter_v", textEn: "V", textFil: "V", category: "letter" },
  { id: "letter_w", label: "letter_w", textEn: "W", textFil: "W", category: "letter" },
  { id: "letter_x", label: "letter_x", textEn: "X", textFil: "X", category: "letter" },
  { id: "letter_y", label: "letter_y", textEn: "Y", textFil: "Y", category: "letter" },
  { id: "letter_z", label: "letter_z", textEn: "Z", textFil: "Z", category: "letter" },

  // Mode-switching gestures (two-hand)
  { id: "mode_navigate", label: "mode_navigate", textEn: "Navigate Mode", textFil: "Navigation", category: "mode" },
  { id: "mode_spelling", label: "mode_spelling", textEn: "Spelling Mode", textFil: "Spelling", category: "mode" },
  { id: "mode_sign", label: "mode_sign", textEn: "Motion Model Mode", textFil: "Motion Model", category: "mode" },
];

/** Look up vocabulary item by label. */
export function getVocabularyItem(label: string): SignVocabularyItem | undefined {
  return SIGN_VOCABULARY.find((item) => item.label === label);
}

/** Get translated text for a sign label. */
export function getTranslation(label: string, language: "en" | "fil"): string {
  const item = getVocabularyItem(label);
  if (!item) return label;
  return language === "en" ? item.textEn : item.textFil;
}

/** All class labels in order (used for model output mapping). */
export const CLASS_LABELS = SIGN_VOCABULARY.map((item) => item.label);

/** Total number of sign classes. */
export const NUM_CLASSES = CLASS_LABELS.length;

/** Number of landmarks per hand. */
export const NUM_LANDMARKS = 21;

/** Max number of hands tracked. */
export const NUM_HANDS = 2;

/** Features per frame: 2 hands × 21 landmarks × 3 coordinates = 126. */
export const FEATURES_PER_FRAME = NUM_HANDS * NUM_LANDMARKS * 3;

/** Features per single hand (for backward compat). */
export const FEATURES_PER_HAND = NUM_LANDMARKS * 3;

/** MediaPipe Hand Landmarker WASM path (loaded from CDN). */
export const MEDIAPIPE_WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

/** MediaPipe Hand Landmarker model URL. */
export const HAND_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
