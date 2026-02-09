# SignAssist Copilot Instructions

## Project Overview
SignAssist is a touchless, real-time sign language recognition and text-to-speech translation web system
built for Mother's Touch – Robinsons Place Marasbaras. Workers are Deaf/Hard-of-Hearing; the system
translates their Filipino Sign Language (FSL) gestures into text and spoken audio for hearing customers.

## Tech Stack
- **Framework:** Next.js 16 (App Router, static export)
- **Language:** TypeScript + Tailwind CSS v4
- **Hand Tracking:** MediaPipe Hand Landmarker (browser-based, GPU-accelerated)
- **ML Model:** Custom Bidirectional LSTM via TensorFlow.js (runs client-side)
- **TTS:** Web Speech API (zero-cost, offline-capable)
- **Training:** Python (TensorFlow/Keras) → exported to TF.js format

## Architecture
- `src/hooks/useHandTracker.ts` — MediaPipe hand detection, webcam management, landmark drawing
- `src/hooks/useGestureClassifier.ts` — TF.js LSTM inference, landmark buffer, demo mode
- `src/hooks/useSpeechOutput.ts` — Web Speech API text-to-speech wrapper
- `src/components/` — CameraFeed, TranslationDisplay, ConfirmationPanel, StatusBar, SpeakingIndicator
- `src/app/page.tsx` — Main kiosk page orchestrating all components
- `src/app/collect/page.tsx` — Data collection tool for recording training samples
- `src/config/index.ts` — Domain-specific FSL vocabulary (30 signs), system config
- `src/types/index.ts` — TypeScript interfaces
- `training/train_model.py` — Python LSTM training pipeline

## Key Constraints
- **Touchless:** No mouse/touch interaction in kiosk mode; all interaction via gestures
- **Low-light:** MediaPipe confidence thresholds lowered to 0.4; CSS brightness boost on video feed
- **Static export:** `output: "export"` in next.config.ts — no server-side features
- **Offline-capable:** All ML runs in-browser; TTS via Web Speech API; no cloud dependencies
- **WCAG AAA:** High-contrast dark theme, large text (≥48px for translations)

## Development Workflow
1. `npm run dev` — Start dev server (camera permission required)
2. Visit `/collect` to record training samples
3. Download samples → place in `training/data/`
4. `python training/train_model.py` → exports model to `public/models/lstm/`
5. `npm run build` → static export to `out/`
6. Deploy to kiosk via Chrome kiosk mode
