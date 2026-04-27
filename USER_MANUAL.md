# SignAssist User Manual

## 1. Purpose

SignAssist is a touchless sign-language-to-speech web application for real-time communication. It uses a webcam to detect hand gestures, translates recognized signs into text, and speaks the output.

This manual explains how to:

- Run the project
- Use the main kiosk interface
- Switch interaction modes using hand gestures
- Collect training samples
- Build and run in kiosk/production mode
- Solve common issues

## 2. Who Should Use This Manual

- Operators using the kiosk during daily service
- Staff supervising kiosk setup and startup
- Developers or researchers collecting new training data

## 3. System Requirements

- Windows, macOS, or Linux machine
- Node.js 18 or newer
- npm
- Webcam
- Chrome or Edge browser (recommended)

Optional (only for model retraining):

- Python 3.10 to 3.12
- pip

## 4. Important Camera Requirement

Webcam access works only in secure browser contexts:

- https://
- http://localhost

If you open the app from an insecure URL (for example a local network IP over plain http), camera access may be blocked.

## 5. Quick Start (Run the App)

1. Open a terminal in the project folder.
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open:

- Main kiosk page: http://localhost:3000
- Data collection page: http://localhost:3000/collect

5. Allow camera permission in the browser.

## 6. Main Kiosk Workflow

### 6.1 Startup Checklist

1. Confirm webcam is connected.
2. Launch the app at http://localhost:3000.
3. Wait until the status indicates the system is ready.
4. Verify model status in the bottom bar:
   - Model loaded: normal operation
   - Demo mode: fallback behavior if model is not loaded

### 6.2 What You See on Screen

- Left panel: camera feed with landmark overlay
- Right panel: live translation and conversation log
- Top-right buttons: manual mode selection
- Floating hand cursor: appears in Navigate Mode for touchless interaction
- Spelling overlay: appears at top of screen in Spelling Mode showing accumulated letters
- Speaking indicator: waveform animation shown while speech output is active
- Bottom bar:
  - System status
  - Language toggle (EN/FIL)
  - Theme toggle (light/dark, persisted across sessions)

### 6.3 Normal Translation Flow

1. User performs a sign in front of the camera.
2. Recognized text appears in large format.
3. A confirmation panel appears.
4. If not cancelled, the phrase auto-confirms after countdown.
5. Confirmed phrase is spoken and saved in conversation log.

## 7. Interaction Modes

SignAssist supports three interaction modes.

### 7.1 Motion Mode (Sign Recognition)

- Purpose: recognize trained sign gestures
- Best for regular vocabulary signs (greetings, service terms, body parts, etc.)

### 7.2 Spelling Mode

- Purpose: build words letter-by-letter using ASL/FSL fingerspelling handshapes
- A letter is accepted after it is detected consistently (held steadily for a brief moment)
- There is a short debounce (~1.2 seconds) between consecutive letters to prevent duplicates from a held pose
- The word auto-finalizes after approximately 3 seconds of no new letter input
- A spelling overlay appears at the top of the screen showing:
  - Accumulated letter boxes with a blinking cursor
  - A countdown timer before auto-finalize
  - Optional notice messages for feedback
- Buttons available in the spelling overlay:
  - Undo: remove last letter
  - Cancel: discard current word
  - Confirm: finalize current word immediately

### 7.3 Navigate Mode

- Purpose: touchless cursor control using hand position
- A floating virtual cursor tracks the position of your index finger
- The cursor smoothly follows your hand movement across the screen
- Pinch gesture (bring thumb and index finger together) acts as a click
- There is a short cooldown between consecutive clicks to prevent accidental repeats
- Cursor appearance changes based on state:
  - Default: white ring
  - Hovering over a button: yellow ring (larger)
  - Pinching/clicking: green ring (smaller)
- Interactive buttons must have the `data-hand-nav` attribute to be clickable

## 8. Gesture-Based Mode Switching

Mode can be switched from gestures (hold for about 1 second):

- Two fists: switch to Navigate Mode
- Two thumbs up: switch to Spelling Mode
- One fist plus one thumbs up: switch to Motion Mode

Notes:

- There is a short cooldown between mode switches.
- A progress ring appears while the mode-switch gesture is being held.

## 9. Confirmation and Cancellation

When a phrase is detected:

- A confirmation panel appears with countdown.
- If countdown finishes, phrase is confirmed automatically.
- You can cancel before auto-confirm using:
  - Cancel button on the confirmation panel

Note:

- The on-screen hint mentions an open-palm cancel gesture. For reliable operation, use the Cancel button unless your deployed model and gesture mapping explicitly support that gesture.

## 10. Language, Theme, and Camera Controls

### 10.1 Language Toggle

- Tap/click EN/FIL to switch output language.
- Speech output uses the selected language preference.

### 10.2 Theme Toggle

- Use theme toggle in the bottom bar to switch between light and dark themes.
- Your theme preference is saved in the browser and persists across sessions.

### 10.3 Camera Toggle

- Use Turn Off Camera / Turn On Camera button in camera panel.
- If camera is off, tracking and recognition pause.

## 11. Using the Data Collection Page

Open: http://localhost:3000/collect

### 11.1 Manual Single-Sample Recording

1. Select category.
2. Select sign label.
3. Enter signer name (optional but recommended).
4. Set lighting condition.
5. Set Frames per Sample.
6. Click Record 1.
7. Hold and perform the target sign until frame capture completes.

### 11.2 Batch Auto-Recording

1. Configure Samples to Record.
2. Configure Delay Between Samples.
3. Click Auto-Record.
4. Use Pause, Resume, or Cancel as needed.
5. Monitor progress bar and sample counters.

### 11.3 Export Samples

- Click Download Samples to save recorded samples as JSON.
- Move downloaded JSON files to training/data/ for model training.

## 12. Optional: Retrain the Model

Use this only when improving recognition with new data.

1. Set up Python environment and install dependencies:

```bash
python -m venv .venv
source .venv/Scripts/activate
pip install -r training/requirements.txt
```

2. Place sample JSON files in training/data/.
3. Run training:

```bash
python training/train_model.py
```

4. Restart the app after training so updated model files load.

### 12.1 Optional: Build Dataset from Videos (Alternative Input Source)

If you have recorded clips instead of live /collect samples:

1. Organize videos by label folder under training/videos/:

- Example structure:
  - training/videos/hello/clip1.mp4
  - training/videos/thank_you/clip1.mp4
  - training/videos/letter_a/clip1.mp4

2. Run landmark extraction:

```bash
python training/extract_from_video.py --videos_dir ./training/videos
```

3. Optional augmentation for more samples:

```bash
python training/extract_from_video.py --videos_dir ./training/videos --augment
```

4. Confirm generated output exists (default):

- training/data/video_samples.json

5. Train as usual:

```bash
python training/train_model.py
```

The training script loads all JSON files in training/data/, so /collect exports and video-extracted samples can be combined.

## 13. Production Build and Kiosk Run

1. Build static output:

```bash
npm run build
```

2. Serve static export:

```bash
npx serve out
```

3. Launch Chrome in kiosk mode (Windows example):

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=http://localhost:3000
```

## 14. Troubleshooting

### 14.1 Camera Access Required Error

- Ensure URL is http://localhost:3000 or https://
- Grant camera permission in browser site settings
- Close other apps that may be using the webcam
- Refresh and retry

### 14.2 Low Recognition Accuracy

- Improve lighting and reduce backlight glare
- Keep both hands clearly inside the camera frame when needed
- Hold gestures steadier for a moment
- Retrain model with more diverse samples

### 14.3 Spelling Mode Not Adding Letters

- Hold each letter handshape steadily until the overlay shows the letter is accepted
- There is a ~1.2 second debounce between letters — wait briefly before showing the next letter
- Avoid rapid repeated motion; the system requires consistent detection before accepting
- If the word auto-finalizes too quickly, finalize manually using the Confirm button
- Use Undo to remove the last letter if a wrong letter was detected

### 14.4 No Speech Output

- Check browser audio volume and output device
- Confirm the phrase was actually confirmed (added to log)
- Toggle language and test again

## 15. Recommended Operator Best Practices

- Position camera at chest-to-shoulder framing distance
- Keep background simple and not cluttered
- Use consistent lighting for stable tracking
- Verify status bar before serving customers
- Periodically review collected samples for quality before retraining

## 16. Daily Startup and Shutdown Checklist

### Startup

1. Start system and open browser.
2. Launch SignAssist.
3. Confirm camera and model status.
4. Test one sign and verify speech output.

### Shutdown

1. Exit kiosk/browser session.
2. Save/export any newly collected samples.
3. Power down device if required.

## 17. Support Notes

For technical adjustments, see project docs:

- README.md for overview and development workflow
- SETUP.txt for full setup and training details
