"""
SignAssist — Extract Hand Landmarks from Video Files
=====================================================

Extract MediaPipe hand landmarks from pre-recorded video files and convert
them into the same JSON format used by the /collect web page, so they can
be fed directly into train_model.py without any changes.

USAGE:
  python extract_from_video.py --videos_dir ./videos --output ./data/video_samples.json

FOLDER STRUCTURE:
  videos/
    hello/
      clip1.mp4
      clip2.mp4
    thank_you/
      clip1.mp4
    letter_a/
      clip1.mp4
      clip2.mp4

  Each subfolder name is the gesture label (must match labels in config).

OPTIONS:
  --videos_dir    Root folder with subfolders per gesture label (default: ./videos)
  --output        Output JSON path (default: ./data/video_samples.json)
  --sequence_len  Frames per sequence, must match config (default: 30)
  --overlap       Sliding window overlap ratio 0.0–0.9 (default: 0.5)
  --augment       Enable data augmentation (jitter, scale, shift) (default: off)
  --signer        Signer name to tag samples with (default: "video")

REQUIREMENTS:
  pip install opencv-python mediapipe numpy

The output JSON is identical in schema to what /collect produces:
  [
    {
      "label": "hello",
      "landmarks": [[x0,y0,z0,...], ...],   // 30 frames × 126 features
      "signer": "video",
      "timestamp": 1707500000000,
      "lighting": "video"
    },
    ...
  ]
"""

import argparse
import json
import os
import time
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision
import numpy as np

# ── Constants (must match train_model.py / config) ──────────
MAX_HANDS = 2
LANDMARKS_PER_HAND = 21
COORDS_PER_LANDMARK = 3  # x, y, z
FEATURES_PER_HAND = LANDMARKS_PER_HAND * COORDS_PER_LANDMARK  # 63
FEATURES_PER_FRAME = MAX_HANDS * FEATURES_PER_HAND  # 126

SUPPORTED_EXTENSIONS = (".mp4", ".avi", ".mov", ".mkv", ".webm", ".MP4", ".MOV")

# MediaPipe hand landmarker model — auto-downloaded on first run
HAND_LANDMARKER_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
HAND_LANDMARKER_MODEL_PATH = Path(__file__).parent / "hand_landmarker.task"


# ── Augmentation helpers ────────────────────────────────────
def _augment_sequence(seq: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """
    Apply small random perturbations to a landmark sequence.
    Keeps x,y in [0,1] roughly; z is untouched.

    Augmentations applied (randomly combined):
      - Gaussian noise on x,y (σ=0.005)
      - Uniform scale on x,y (0.95–1.05)
      - Uniform shift on x,y (±0.02)
    """
    aug = seq.copy()
    n_frames, n_feat = aug.shape

    for hand_idx in range(MAX_HANDS):
        offset = hand_idx * FEATURES_PER_HAND
        for lm in range(LANDMARKS_PER_HAND):
            xi = offset + lm * COORDS_PER_LANDMARK
            yi = xi + 1
            # Noise
            aug[:, xi] += rng.normal(0, 0.005, size=n_frames).astype(np.float32)
            aug[:, yi] += rng.normal(0, 0.005, size=n_frames).astype(np.float32)
            # Scale
            sx = rng.uniform(0.95, 1.05)
            sy = rng.uniform(0.95, 1.05)
            aug[:, xi] *= sx
            aug[:, yi] *= sy
            # Shift
            aug[:, xi] += rng.uniform(-0.02, 0.02)
            aug[:, yi] += rng.uniform(-0.02, 0.02)

    return aug


def _ensure_model_downloaded() -> Path:
    """Download the hand landmarker model if not already cached."""
    if HAND_LANDMARKER_MODEL_PATH.exists():
        return HAND_LANDMARKER_MODEL_PATH
    print(f"Downloading hand landmarker model to {HAND_LANDMARKER_MODEL_PATH}...")
    import urllib.request
    urllib.request.urlretrieve(HAND_LANDMARKER_MODEL_URL, HAND_LANDMARKER_MODEL_PATH)
    print("Download complete.")
    return HAND_LANDMARKER_MODEL_PATH


def _create_hand_landmarker() -> mp_vision.HandLandmarker:
    """Create a MediaPipe HandLandmarker using the Tasks API."""
    model_path = _ensure_model_downloaded()
    base_options = mp_tasks.BaseOptions(model_asset_path=str(model_path))
    options = mp_vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=mp_vision.RunningMode.IMAGE,
        num_hands=MAX_HANDS,
        min_hand_detection_confidence=0.4,
    )
    return mp_vision.HandLandmarker.create_from_options(options)


# ── Core extraction ─────────────────────────────────────────
def extract_frames(
    video_path: str,
    detector: mp_vision.HandLandmarker,
) -> list[list[float]]:
    """
    Read every frame of a video and return a flat list of landmark vectors.
    Each vector has FEATURES_PER_FRAME (126) floats.
    Frames where no hand is detected still get a zero vector (keeps timing).
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"  ⚠️  Could not open: {video_path}")
        return []

    frames: list[list[float]] = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = detector.detect(mp_image)

        vec = [0.0] * FEATURES_PER_FRAME

        if result.hand_landmarks:
            for hand_idx, hand_lms in enumerate(result.hand_landmarks):
                if hand_idx >= MAX_HANDS:
                    break
                offset = hand_idx * FEATURES_PER_HAND
                for lm_idx, lm in enumerate(hand_lms):
                    base = offset + lm_idx * COORDS_PER_LANDMARK
                    vec[base] = lm.x
                    vec[base + 1] = lm.y
                    vec[base + 2] = lm.z

        frames.append(vec)

    cap.release()
    return frames


def build_sequences(
    frames: list[list[float]],
    sequence_length: int,
    overlap: float,
) -> list[list[list[float]]]:
    """
    Slice frame list into overlapping windows of `sequence_length`.
    Short clips are padded by repeating the last frame.
    """
    if not frames:
        return []

    # Pad short clips
    if len(frames) < sequence_length:
        while len(frames) < sequence_length:
            frames.append(frames[-1])
        return [frames[:sequence_length]]

    step = max(1, int(sequence_length * (1.0 - overlap)))
    sequences = []

    for start in range(0, len(frames) - sequence_length + 1, step):
        sequences.append(frames[start: start + sequence_length])

    return sequences


def process_videos(
    videos_dir: Path,
    output_path: Path,
    sequence_length: int,
    overlap: float,
    augment: bool,
    signer: str,
) -> None:
    """
    Walk videos_dir/<label>/*.mp4, extract landmarks, write a single JSON file
    compatible with train_model.py's load_samples().
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    hands = _create_hand_landmarker()

    rng = np.random.default_rng(42) if augment else None
    all_samples: list[dict] = []

    label_dirs = sorted(
        d for d in videos_dir.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    )

    if not label_dirs:
        print(f"❌ No label subfolders found in {videos_dir}")
        print("   Expected structure: videos/<gesture_label>/<clip>.mp4")
        hands.close()
        return

    print(f"Found {len(label_dirs)} gesture labels in {videos_dir}\n")

    total_sequences = 0

    for label_dir in label_dirs:
        label = label_dir.name
        video_files = [
            f for f in label_dir.iterdir()
            if f.suffix in SUPPORTED_EXTENSIONS
        ]

        if not video_files:
            print(f"  ⚠️  No video files in {label_dir.name}/, skipping")
            continue

        label_count = 0

        for vf in sorted(video_files):
            print(f"  📹 {label}/{vf.name} ... ", end="", flush=True)

            frames = extract_frames(str(vf), hands)
            if not frames:
                print("skipped (no frames)")
                continue

            sequences = build_sequences(frames, sequence_length, overlap)
            print(f"{len(frames)} frames → {len(sequences)} sequences")

            for seq in sequences:
                sample = {
                    "label": label,
                    "landmarks": seq,
                    "signer": signer,
                    "timestamp": int(time.time() * 1000),
                    "lighting": "video",
                    "source": str(vf.name),
                }
                all_samples.append(sample)

                # Augmented copies
                if augment and rng is not None:
                    seq_np = np.array(seq, dtype=np.float32)
                    for _ in range(2):  # 2 augmented copies per original
                        aug = _augment_sequence(seq_np, rng)
                        aug_sample = {
                            "label": label,
                            "landmarks": aug.tolist(),
                            "signer": f"{signer}_aug",
                            "timestamp": int(time.time() * 1000),
                            "lighting": "video_augmented",
                            "source": str(vf.name),
                        }
                        all_samples.append(aug_sample)

            label_count += len(sequences)

        aug_note = f" (+{label_count * 2} augmented)" if augment else ""
        print(f"  ✅ {label}: {label_count} sequences{aug_note}\n")
        total_sequences += label_count

    hands.close()

    if not all_samples:
        print("❌ No sequences extracted. Check your video folder structure.")
        return

    # Write JSON (same format as /collect page output)
    with open(output_path, "w") as f:
        json.dump(all_samples, f)

    total_with_aug = len(all_samples)
    size_mb = output_path.stat().st_size / (1024 * 1024)

    print(f"{'═' * 55}")
    print(f"✅ Extracted {total_with_aug} total samples → {output_path}")
    print(f"   ({total_sequences} original + {total_with_aug - total_sequences} augmented)")
    print(f"   File size: {size_mb:.1f} MB")
    print(f"   Sequence length: {sequence_length} frames × {FEATURES_PER_FRAME} features")
    print(f"{'═' * 55}")
    print()
    print("Next steps:")
    print("  1. Verify the output file is in training/data/")
    print("  2. Run: python train_model.py")
    print("  3. The trained model will be exported to public/models/lstm/")


# ── CLI ─────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Extract hand landmarks from gesture videos for LSTM training.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic extraction
  python extract_from_video.py --videos_dir ./videos

  # With augmentation (3× more samples)
  python extract_from_video.py --videos_dir ./videos --augment

  # Custom settings
  python extract_from_video.py --videos_dir ./videos --overlap 0.75 --signer Maria
        """,
    )
    parser.add_argument(
        "--videos_dir",
        type=str,
        default="./videos",
        help="Root folder with subfolders per gesture label (default: ./videos)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="./data/video_samples.json",
        help="Output JSON file path (default: ./data/video_samples.json)",
    )
    parser.add_argument(
        "--sequence_len",
        type=int,
        default=30,
        help="Frames per sequence — must match DEFAULT_CONFIG.sequenceLength (default: 30)",
    )
    parser.add_argument(
        "--overlap",
        type=float,
        default=0.5,
        help="Sliding window overlap ratio 0.0–0.9 (default: 0.5)",
    )
    parser.add_argument(
        "--augment",
        action="store_true",
        help="Enable data augmentation (jitter, scale, shift) — 3× more samples",
    )
    parser.add_argument(
        "--signer",
        type=str,
        default="video",
        help="Signer name to tag samples with (default: 'video')",
    )

    args = parser.parse_args()

    if not 0.0 <= args.overlap <= 0.9:
        parser.error("--overlap must be between 0.0 and 0.9")

    process_videos(
        videos_dir=Path(args.videos_dir),
        output_path=Path(args.output),
        sequence_length=args.sequence_len,
        overlap=args.overlap,
        augment=args.augment,
        signer=args.signer,
    )


if __name__ == "__main__":
    main()
