# SignAssist Technical Documentation

## 1. Document Scope

This document is for developers and maintainers of SignAssist. It describes runtime architecture, data flow, model training and export, configuration contracts, and deployment behavior.

## 2. System Overview

SignAssist is a client-side, touchless sign-language recognition and text-to-speech web application.

High-level pipeline:

1. Webcam frames are captured in-browser.
2. MediaPipe detects up to two hands and returns 21 landmarks per hand.
3. Landmarks are converted into fixed-width feature vectors.
4. A TensorFlow.js Bidirectional LSTM classifies gestures from a temporal sequence.
5. The UI renders translation, confirmation state, and transcript.
6. Confirmed text is spoken with Web Speech API.

## 3. Technology Stack

- Frontend: Next.js 16, React 19, TypeScript
- Styling: Tailwind CSS v4
- Hand tracking: @mediapipe/tasks-vision
- Inference: @tensorflow/tfjs
- Speech: Browser SpeechSynthesis API
- Training: Python, TensorFlow/Keras, scikit-learn
- Export target: Static export via Next.js output export

## 4. Repository Architecture

Core application:

- src/app/page.tsx: main kiosk orchestrator
- src/app/collect/page.tsx: training sample collection UI
- src/hooks/useHandTracker.ts: MediaPipe lifecycle and frame loop
- src/hooks/useGestureClassifier.ts: TF.js model loading and sequence classification
- src/hooks/useSpeechOutput.ts: speech abstraction
- src/hooks/useModeSwitcher.ts: gesture hold-based mode switching
- src/hooks/useHandNavigation.ts: virtual cursor and pinch click in navigate mode
- src/hooks/useWordBuilder.ts: spelling word assembly and auto-finalize
- src/config/index.ts: constants, vocabulary, labels, confidence defaults
- src/types/index.ts: shared TS contracts

Training and model assets:

- training/train_model.py: dataset prep, LSTM training, eval, TF.js export
- training/extract_from_video.py: offline video-to-landmark extraction
- public/models/lstm/: runtime TF.js model.json, shards, labels.json

Build and platform:

- next.config.ts: output export enabled for static deployment
- package.json: scripts and runtime dependencies

## 5. Runtime Data Model

### 5.1 Hand Landmark Frame

Each detected hand contains 21 landmarks. Each landmark has x, y, z. Runtime hand frame contract:

- landmarks: array of 21 points
- handedness: Left or Right
- timestamp: performance clock timestamp

### 5.2 Feature Vector Shape

System uses two-hand encoding:

- MAX_HANDS = 2
- LANDMARKS_PER_HAND = 21
- COORDS = 3
- FEATURES_PER_HAND = 63
- FEATURES_PER_FRAME = 126

Frame encoding rule:

- First hand occupies indices 0 to 62
- Second hand occupies indices 63 to 125
- Missing second hand is zero padded

### 5.3 Temporal Sequence Shape

Default sequence length is 30 frames. LSTM input shape at inference and training:

- batch x 30 x 126

When a sequence is shorter than 30 at inference, last frame replication is used to pad to full length.

## 6. Kiosk Runtime Architecture

### 6.1 Orchestrator

src/app/page.tsx coordinates:

- camera and hand-tracking lifecycle
- gesture classification cadence
- mode switching and mode-specific behavior
- pending translation and confirmation countdown
- transcript updates
- TTS output and speaking state

### 6.2 Hand Tracking Lifecycle

useHandTracker performs:

1. MediaPipe HandLandmarker init with GPU delegate.
2. getUserMedia webcam open.
3. requestAnimationFrame detection loop.
4. draw mirrored video plus landmarks on canvas.
5. callback of normalized hand frames to application layer.

Resilience behavior:

- closes previous detector before re-init
- guards concurrent start calls
- handles rapid camera toggles safely
- fully closes detector on stop to avoid stale graph state

### 6.3 Classification Lifecycle

useGestureClassifier performs:

1. Sets tfjs backend to webgl.
2. Loads labels from public models labels.json, with fallback to config labels.
3. Loads model.json from public models.
4. Validates output dimension against label count.
5. Warms model with zeros tensor.
6. Accepts feature frames and maintains sliding buffer.
7. Runs periodic inference while app is in detecting state.

Inference acceptance:

- argmax class selected
- prediction accepted only if confidence >= configured threshold
- default confidence threshold: 0.45

No-model behavior:

- demo prediction is disabled
- classifier returns null until a real model is available

### 6.4 Modes and Interaction

Supported modes:

- sign
- spelling
- navigate

Switching paths:

1. Model-predicted labels mode_navigate, mode_spelling, mode_sign
2. Heuristic hold gestures in useModeSwitcher

Heuristic hold gestures:

- two fists -> navigate
- two thumbs up -> spelling
- one fist plus one thumbs up -> sign

Mode switch mechanics:

- hold duration about 1000 ms
- cooldown about 1500 ms
- hold progress ring surfaced to UI

### 6.5 Spelling Pipeline

Spelling mode behavior:

- consumes only labels that start with letter_
- applies confidence gate for letters
- applies streak requirement before accepting a letter
- applies minimum gap between repeated letters
- auto-finalize delay for completed word if no new input

Word builder output is promoted to pending confirmation, same as sign mode phrase output.

### 6.6 Touchless Navigation

In navigate mode:

- index fingertip drives virtual cursor position
- pinch gesture triggers click on nearest element matching data-hand-nav
- DOM updates use direct transform writes for smooth 30 fps movement

## 7. UI State Machine

Primary status states:

- initializing
- ready
- detecting
- confirming
- speaking
- error

Typical transition path:

- initializing -> ready
- ready -> detecting when hands appear
- detecting -> confirming when prediction accepted
- confirming -> speaking on confirm
- speaking -> ready on speech end

Error path:

- camera init failure routes to blocking error screen with retry

## 8. Vocabulary and Label Contract

Vocabulary is defined in src/config/index.ts and includes:

- service-domain words
- letter labels letter_a to letter_z
- mode labels mode_navigate, mode_spelling, mode_sign
- unknown label

Critical contract:

- training label strings must match runtime labels used in vocabulary and inference mapping

## 9. Training Pipeline

File: training/train_model.py

### 9.1 Input Sources

The trainer loads every JSON file in training/data. Sources can include:

- /collect exports
- extract_from_video outputs

### 9.2 Sample Normalization

Per-sample handling:

- accepts both 63 and 126 feature frames
- upgrades legacy 63 to 126 by zero-padding second hand
- pads short clips by repeating final frame
- downsamples long clips uniformly to 30 frames

### 9.3 Dataset Split

Uses stratified split:

- test split 0.15
- validation split 0.15 from remaining trainval portion

### 9.4 Model Architecture

Keras sequential stack:

1. Input shape 30 x 126
2. Bidirectional LSTM 128, return sequences true
3. Dropout 0.3
4. Bidirectional LSTM 64, return sequences false
5. Dropout 0.3
6. Dense 64 relu
7. Dropout 0.3
8. Dense num_classes softmax

Optimizer and objective:

- Adam with learning rate 0.001
- sparse categorical crossentropy
- metric accuracy

Callbacks:

- EarlyStopping with patience 10 and restore best weights
- ReduceLROnPlateau with factor 0.5 and patience 5

### 9.5 Export

Outputs:

- training/model.keras
- training/labels.json
- public/models/lstm/model.json
- public/models/lstm/group1 shard binaries
- public/models/lstm/labels.json

Export strategy:

- prefers tensorflowjs converter
- falls back to manual TF.js layers export if converter is unavailable
- patches model.json for Keras 3 and TF.js compatibility

## 10. Video Extraction Pipeline

File: training/extract_from_video.py

Purpose:

- Converts pre-recorded clips into collect-compatible landmark JSON samples.

Expected folder structure:

- training/videos/<label>/<video files>

Processing:

1. Opens each clip with OpenCV.
2. Runs MediaPipe Tasks detector per frame.
3. Encodes each frame to 126-feature vector.
4. Builds sliding windows of sequence_len with configurable overlap.
5. Optional augmentation creates extra synthetic sequences.
6. Writes consolidated JSON output, default training/data/video_samples.json.

## 11. Configuration Surface

Core constants in src/config/index.ts:

- confidenceThreshold: default 0.45
- sequenceLength: default 30
- confirmationDelay: default 2 seconds
- language: default en
- speechRate: default 0.9
- handDetectionConfidence: default 0.4
- handTrackingConfidence: default 0.4

Low-light tuning currently lowers detector/tracker confidence to 0.4.

## 12. Build and Deployment

next.config.ts sets output export. This enforces static-site deployment behavior.

Build flow:

1. npm run build
2. static artifacts generated in out
3. serve out via static web server

Camera requirement in production:

- secure context is required for getUserMedia
- localhost is allowed without https
- non-localhost production should use https

## 13. Browser and Platform Notes

- Speech synthesis voice availability differs by OS and installed voices.
- Preferred voices are selected by language prefix and vendor name heuristics.
- WebGL backend is preferred for tfjs performance.
- In constrained devices, detector plus tfjs may compete for GPU resources.

## 14. Operational Observability

Current observability is console-driven:

- model load, class counts, and prediction traces are logged
- classification confidence outputs are logged per inference
- training script prints dataset stats and class report

No dedicated telemetry backend is currently implemented.

## 15. Known Technical Constraints

- No backend persistence for transcripts or sessions.
- No automated test suite currently included in repository.
- Inference quality is strongly tied to camera angle and data quality.
- Label drift between model labels and config labels can cause mismatches.

## 16. Extension Points

Common extension tasks:

1. Add new sign classes
   - update vocabulary in config
   - collect data
   - retrain and export model

2. Tune recognition sensitivity
   - adjust confidence threshold
   - adjust sequence length and collection timing

3. Improve low-light stability
   - tune MediaPipe confidence thresholds
   - improve camera exposure and scene lighting

4. Add persistence or analytics
   - introduce backend API or local storage schema

## 17. Developer Runbook

Local app run:

- npm install
- npm run dev

Training run from repo root with activated environment:

- python training/train_model.py

Video extraction example:

- python training/extract_from_video.py --videos_dir ./training/videos --augment

Production static build:

- npm run build
- npx serve out

## 18. Validation Checklist After Changes

After any model or pipeline change:

1. Confirm model files exist in public/models/lstm.
2. Start app and verify model status shows loaded.
3. Validate each mode switch path.
4. Validate one sign classification and one spelling flow.
5. Validate confirmation, transcript logging, and speech output.
6. Validate camera toggle off/on recovery.
