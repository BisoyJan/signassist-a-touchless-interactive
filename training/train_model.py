"""
SignAssist — LSTM Model Training Pipeline
==========================================

This script trains a Bidirectional LSTM model on hand landmark sequences
collected via the SignAssist data collection page (/collect).

USAGE:
  1. Collect samples via the web app (/collect) and download the JSON file(s)
  2. Place the JSON files in the training/data/ folder
  3. Run: python training/train_model.py
  4. The trained model will be exported to public/models/lstm/

REQUIREMENTS:
  pip install tensorflow numpy scikit-learn

INPUT FORMAT (from data collection page):
  [
    {
      "label": "hello",
      "landmarks": [[x0, y0, z0, x1, y1, z1, ...], ...],  // 30 frames × 63 features
      "signer": "Maria",
      "timestamp": 1707500000000,
      "lighting": "bright"
    },
    ...
  ]
"""

import json
import os
import glob
import numpy as np
from pathlib import Path

# ── Configuration ────────────────────────────────────────────
SEQUENCE_LENGTH = 30          # Must match DEFAULT_CONFIG.sequenceLength
FEATURES_PER_FRAME = 63       # 21 landmarks × 3 coordinates (x, y, z)
EPOCHS = 100
BATCH_SIZE = 32
LEARNING_RATE = 0.001
VALIDATION_SPLIT = 0.15
TEST_SPLIT = 0.15
RANDOM_SEED = 42

# Paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "data"
OUTPUT_DIR = SCRIPT_DIR.parent / "public" / "models" / "lstm"
TFJS_OUTPUT_DIR = OUTPUT_DIR


def load_samples(data_dir: Path) -> list[dict]:
    """Load all JSON sample files from the data directory."""
    samples = []
    json_files = list(data_dir.glob("*.json"))

    if not json_files:
        raise FileNotFoundError(
            f"No JSON files found in {data_dir}.\n"
            "Please collect samples using the web app (/collect) first."
        )

    for f in json_files:
        with open(f, "r") as fh:
            data = json.load(fh)
            if isinstance(data, list):
                samples.extend(data)
            else:
                samples.append(data)

    print(f"Loaded {len(samples)} samples from {len(json_files)} file(s)")
    return samples


def prepare_dataset(
    samples: list[dict],
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Convert raw samples into numpy arrays for training."""
    # Get unique labels
    labels = sorted(set(s["label"] for s in samples))
    label_to_idx = {label: i for i, label in enumerate(labels)}

    X = []
    y = []

    for sample in samples:
        landmarks = sample["landmarks"]
        if len(landmarks) != SEQUENCE_LENGTH:
            print(f"  Skipping sample with {len(landmarks)} frames (expected {SEQUENCE_LENGTH})")
            continue
        if len(landmarks[0]) != FEATURES_PER_FRAME:
            print(f"  Skipping sample with {len(landmarks[0])} features (expected {FEATURES_PER_FRAME})")
            continue

        X.append(landmarks)
        y.append(label_to_idx[sample["label"]])

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)

    print(f"Dataset: {X.shape[0]} samples, {len(labels)} classes")
    print(f"  Shape: X={X.shape}, y={y.shape}")
    print(f"  Labels: {labels}")

    # Print per-class counts
    for label in labels:
        count = np.sum(y == label_to_idx[label])
        print(f"    {label}: {count} samples")

    return X, y, labels


def build_model(num_classes: int) -> "tf.keras.Model":
    """Build the Bidirectional LSTM classifier."""
    import tensorflow as tf

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(SEQUENCE_LENGTH, FEATURES_PER_FRAME)),

        # Bidirectional LSTM layers
        tf.keras.layers.Bidirectional(
            tf.keras.layers.LSTM(128, return_sequences=True)
        ),
        tf.keras.layers.Dropout(0.3),

        tf.keras.layers.Bidirectional(
            tf.keras.layers.LSTM(64, return_sequences=False)
        ),
        tf.keras.layers.Dropout(0.3),

        # Dense classification head
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.summary()
    return model


def train():
    """Main training pipeline."""
    import tensorflow as tf
    from sklearn.model_selection import train_test_split

    np.random.seed(RANDOM_SEED)
    tf.random.set_seed(RANDOM_SEED)

    # 1. Load data
    print("\n=== Loading Data ===")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    samples = load_samples(DATA_DIR)

    # 2. Prepare dataset
    print("\n=== Preparing Dataset ===")
    X, y, labels = prepare_dataset(samples)

    if len(X) < 10:
        print("\n⚠️  WARNING: Very few samples. Collect at least 50-100 per sign for good results.")

    # 3. Split: train / val / test
    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X, y, test_size=TEST_SPLIT, random_state=RANDOM_SEED, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval, y_trainval,
        test_size=VALIDATION_SPLIT / (1 - TEST_SPLIT),
        random_state=RANDOM_SEED,
        stratify=y_trainval,
    )
    print(f"\n  Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

    # 4. Build model
    print("\n=== Building Model ===")
    model = build_model(num_classes=len(labels))

    # 5. Train
    print("\n=== Training ===")
    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=10, restore_best_weights=True
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6
        ),
    ]

    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1,
    )

    # 6. Evaluate on test set
    print("\n=== Evaluation ===")
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"  Test Loss: {test_loss:.4f}")
    print(f"  Test Accuracy: {test_acc:.4f}")

    # Per-class metrics
    y_pred = np.argmax(model.predict(X_test, verbose=0), axis=1)
    from sklearn.metrics import classification_report

    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=labels))

    # 7. Save Keras model
    print("\n=== Saving Model ===")
    keras_path = SCRIPT_DIR / "model.keras"
    model.save(keras_path)
    print(f"  Keras model saved to: {keras_path}")

    # 8. Save label mapping
    label_map_path = SCRIPT_DIR / "labels.json"
    with open(label_map_path, "w") as f:
        json.dump(labels, f, indent=2)
    print(f"  Labels saved to: {label_map_path}")

    # 9. Convert to TensorFlow.js
    print("\n=== Converting to TensorFlow.js ===")
    try:
        import tensorflowjs as tfjs

        TFJS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        tfjs.converters.save_keras_model(model, str(TFJS_OUTPUT_DIR))
        print(f"  TF.js model saved to: {TFJS_OUTPUT_DIR}")

        # 9a. Patch model.json for Keras 3 → TF.js compatibility
        _patch_model_json(TFJS_OUTPUT_DIR / "model.json")

        # Also copy labels to the public dir
        import shutil
        shutil.copy2(label_map_path, TFJS_OUTPUT_DIR / "labels.json")
        print(f"  Labels copied to: {TFJS_OUTPUT_DIR / 'labels.json'}")

        print("\n✅ Done! The model is ready for the web app.")
        print(f"   Model location: {TFJS_OUTPUT_DIR}")
    except ImportError:
        print("\n⚠️  tensorflowjs not installed. Install it with:")
        print("    pip install tensorflowjs")
        print(f"\n  Then convert manually:")
        print(f"    tensorflowjs_converter --input_format=keras {keras_path} {TFJS_OUTPUT_DIR}")


def _patch_model_json(model_json_path: Path):
    """
    Patch the TF.js model.json to fix Keras 3 compatibility issues.

    Keras 3 exports fields that TF.js doesn't understand:
      - `batch_shape` should be `batch_input_shape`
      - `dtype` uses DTypePolicy objects instead of simple strings
      - Initializers use {"module": ..., "class_name": ..., "registered_name": ...}
        instead of {"class_name": ..., "config": {...}}
      - Extra fields: build_config, quantization_config, optional, zero_output_for_mask
    """
    import re

    with open(model_json_path, "r") as f:
        raw = f.read()

    # 1. batch_shape → batch_input_shape (InputLayer)
    raw = raw.replace('"batch_shape":', '"batch_input_shape":')

    # Parse and deep-clean
    model = json.loads(raw)

    def _clean(obj):
        if isinstance(obj, dict):
            # Keras 3 module-style refs → TF.js style
            if "module" in obj and "class_name" in obj and "registered_name" in obj:
                return {"class_name": obj["class_name"], "config": _clean(obj.get("config", {}))}
            result = {}
            for k, v in obj.items():
                if k in ("zero_output_for_mask", "build_config", "quantization_config", "optional"):
                    continue
                result[k] = _clean(v)
            return result
        elif isinstance(obj, list):
            return [_clean(item) for item in obj]
        return obj

    model["modelTopology"] = _clean(model["modelTopology"])

    with open(model_json_path, "w") as f:
        json.dump(model, f)

    print("  Patched model.json for TF.js compatibility (Keras 3 fixes applied)")


if __name__ == "__main__":
    train()
