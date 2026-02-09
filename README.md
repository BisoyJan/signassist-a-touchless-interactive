# SignAssist

**A Touchless Interactive Real-Time Sign Language Recognition and Text-to-Speech Translation Web System for Mother's Touch – Robinsons Place Marasbaras**

---

## Overview

SignAssist bridges the communication gap between Deaf/Hard-of-Hearing (DHH) massage therapists at Mother's Touch and their hearing customers. Using only a standard webcam and a browser, it translates Filipino Sign Language (FSL) gestures into readable text and spoken audio — completely touchless, real-time, and without specialized hardware.

## Features

- **Real-time hand tracking** via MediaPipe Hand Landmarker (GPU-accelerated, browser-based)
- **Custom gesture recognition** using a Bidirectional LSTM model running in TensorFlow.js
- **Text-to-speech** output via the Web Speech API (English + Filipino)
- **Touchless UI** — all interaction through gestures; no mouse, keyboard, or touch required
- **Visual confirmation** with auto-confirm countdown before speaking
- **Conversation transcript** log showing recent translations
- **Low-light optimized** (lowered detection thresholds + CSS brightness enhancement)
- **Domain-specific vocabulary** — 30 massage-related signs (greetings, body parts, services, feedback)
- **Data collection tool** at `/collect` for recording training samples
- **Fully offline** — no cloud APIs needed; runs entirely in the browser

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React 19, TypeScript | App framework with static export |
| Styling | Tailwind CSS v4 | Kiosk-optimized dark UI |
| Hand Tracking | MediaPipe Hand Landmarker | 21-point hand landmark detection |
| ML Inference | TensorFlow.js | Browser-based LSTM gesture classification |
| Voice Output | Web Speech API | Text-to-speech in English/Filipino |
| Training | Python, TensorFlow/Keras | Bidirectional LSTM model training |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A webcam
- Chrome or Edge browser (for MediaPipe + Web Speech API support)

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — allow camera access when prompted.

### Kiosk Mode (Production)

```bash
npm run build
npx serve out
# Then open Chrome in kiosk mode:
# chrome.exe --kiosk --app=http://localhost:3000
```

## Training the Model

### 1. Collect Samples

Visit `/collect` in the dev server to record sign language gesture samples. For each sign:
- Select the sign label
- Enter the signer's name
- Set the lighting condition
- Click "Start Recording" and perform the gesture
- Repeat 50–100 times per sign, across 3–5 different signers

Download the JSON file when done.

### 2. Train the LSTM

```bash
cd training
pip install -r requirements.txt
# Place your collected JSON files in training/data/
python train_model.py
```

The script will:
- Load all sample files from `training/data/`
- Train a Bidirectional LSTM (128→64 units)
- Evaluate on a held-out test set
- Export the model to `public/models/lstm/` in TF.js format

### 3. Verify

Restart the dev server — the model will auto-load and the "Demo mode" indicator will change to "Model loaded".

## Project Structure

```
signassist/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main kiosk page
│   │   ├── collect/page.tsx      # Data collection tool
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Kiosk-optimized styles
│   ├── components/
│   │   ├── CameraFeed.tsx        # Webcam + landmark overlay
│   │   ├── TranslationDisplay.tsx # Current translation + transcript
│   │   ├── ConfirmationPanel.tsx # Auto-confirm countdown
│   │   ├── StatusBar.tsx         # System status + language toggle
│   │   └── SpeakingIndicator.tsx # TTS audio visualizer
│   ├── hooks/
│   │   ├── useHandTracker.ts     # MediaPipe integration
│   │   ├── useGestureClassifier.ts # TF.js LSTM inference
│   │   └── useSpeechOutput.ts    # Web Speech API wrapper
│   ├── config/
│   │   └── index.ts              # Vocabulary, config constants
│   └── types/
│       └── index.ts              # TypeScript interfaces
├── training/
│   ├── train_model.py            # Python LSTM training pipeline
│   ├── requirements.txt          # Python dependencies
│   └── data/                     # Place collected JSON samples here
├── public/
│   └── models/lstm/              # Exported TF.js model (after training)
├── next.config.ts                # Static export configuration
└── package.json
```

## Sign Vocabulary

The system recognizes 30 domain-specific signs across 6 categories:

| Category | Signs |
|----------|-------|
| Greeting | Hello, Welcome, Thank you, Goodbye |
| Body Part | Head, Neck, Shoulder, Back, Hand, Foot |
| Service | Massage, Oil, Light/Medium/Strong pressure, Hot, Cold |
| Duration | 30 minutes, 1 hour, How long? |
| Feedback | Pain, Good, Stop |
| General | Yes, No, Wait, Done, How much? |

## License

This project is developed as a thesis for academic purposes.
