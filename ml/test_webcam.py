"""
SignMedic - Live Webcam Gesture Recognition Tester
Tests the offline trained model in real-time with your webcam.
Supports FEATURE_SPEC v2.0.0 and 11 classes (10 triage gestures + _OTHER_).
Optimized with Sweet Spot Real-Time Cadence:
- Sliding Window: 45 frames (~1.5s)
- Minimum Active Movement: 30 frames (~1.0s stroke peak)
- Evaluation Cadence: 12 frames (~400ms)
- Temporal Probability Smoothing (EMA: 0.65 current + 0.35 prev)
- Cooldown: 1.2s anti-spam with streak reset

Controls:
- Perform gestures in front of the camera.
- Stable predictions (N=2) confirm the candidate in ~1.4 - 1.6s.
- Press 'q' or 'ESC' to exit.
"""

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import time
import json
import yaml
import cv2
import numpy as np
import tf_keras as keras

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Local imports from extract_landmarks
from extract_landmarks import (
    process_segment_v2,
    FEATURE_DIM,
    TARGET_T,
    MODEL_TASK_PATH
)

# Hand skeleton connections for drawing landmarks
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),        # Thumb
    (0, 5), (5, 6), (6, 7), (7, 8),        # Index
    (5, 9), (9, 10), (10, 11), (11, 12),   # Middle
    (9, 13), (13, 14), (14, 15), (15, 16), # Ring
    (13, 17), (17, 18), (18, 19), (19, 20),# Pinky
    (0, 17)                                # Palm base
]


def draw_hand_skeleton(frame, hand_landmarks, width, height, color=(0, 255, 128)):
    """Draws 21 landmark points and skeleton lines on the OpenCV frame."""
    coords = []
    for lm in hand_landmarks:
        cx, cy = int(lm.x * width), int(lm.y * height)
        coords.append((cx, cy))
        cv2.circle(frame, (cx, cy), 4, color, -1)
        cv2.circle(frame, (cx, cy), 6, (255, 255, 255), 1)

    for start_idx, end_idx in HAND_CONNECTIONS:
        cv2.line(frame, coords[start_idx], coords[end_idx], color, 2)


def main():
    model_path = os.path.join(os.path.dirname(__file__), "final_model.h5")
    metrics_path = os.path.join(os.path.dirname(__file__), "reports", "metrics.json")
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}. Run train.py first.")
        return

    # Load classes and calibrated threshold
    classes = ["Air", "Makan", "Saya", "Tuli", "Maaf", "Terima kasih", "Batuk", "Demam", "Pilek", "Sesak Nafas", "_OTHER_"]
    threshold = 0.85
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
            if "data" in cfg and "target_classes" in cfg["data"]:
                classes = list(cfg["data"]["target_classes"]) + ["_OTHER_"]

    print("=" * 60)
    print("SignMedic Real-Time Webcam Gesture Recognition (v2.0.0)")
    print("Sweet Spot Sliding Window: 45 frames | Cadence: 12 frames (~400ms) | EMA: 0.65/0.35")
    print(f"Supported classes ({len(classes)}): {classes}")
    print(f"Confidence threshold: {threshold * 100:.0f}%")
    print("Press 'q' in the webcam window to exit.")
    print("=" * 60)

    # Load Model
    print("Loading gesture classifier model...")
    model = keras.models.load_model(model_path)

    # Initialize MediaPipe Tasks HandLandmarker
    base_options = python.BaseOptions(model_asset_path=MODEL_TASK_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=2
    )
    detector = vision.HandLandmarker.create_from_options(options)

    # Open Webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam. Ensure your camera is connected and not used by another application.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    buffer_raw_hands = []
    hand_lost_counter = 0
    max_buffer = 45           # Sliding window capacity (~1.5s at 30 FPS)
    min_segment_frames = 30   # Minimum movement frames before first evaluation (~1.0s stroke peak)
    cadence_frames = 12       # Evaluate every 12 frames (~400ms rolling interval)
    cooldown_seconds = 1.2    # Anti-spam cooldown after accepting a candidate
    last_accepted_time = 0.0
    was_cooling_down = False
    frame_step = 0
    prev_smoothed_probs = None
    
    last_candidate = None
    last_confidence = 0.0
    stability_class = None
    stability_count = 0
    candidate_confirmed = False
    
    current_probs = [0.0] * len(classes)
    
    frame_idx = 0
    fps_history = []
    t_start = time.time()

    print("\nWebcam started! Look at the camera window.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to capture frame from webcam.")
            break

        # Mirror frame horizontally for natural user interaction
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape

        # MediaPipe detection
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        timestamp_ms = int(frame_idx * (1000.0 / 30.0))
        
        result = detector.detect_for_video(mp_image, timestamp_ms)
        detected_hands = result.hand_landmarks if result and result.hand_landmarks else []

        # Draw detected hand skeletons
        for hand in detected_hands:
            draw_hand_skeleton(frame, hand, w, h, color=(0, 230, 115))

        has_hands = len(detected_hands) > 0

        # Sweet Spot Sliding Window Cadence
        trigger_eval = False
        now = time.time()
        is_cooling_down = (now - last_accepted_time) < cooldown_seconds

        # Reset buffer and EMA probability smoothing when cooldown ends
        if was_cooling_down and not is_cooling_down:
            buffer_raw_hands = []
            prev_smoothed_probs = None
            stability_count = 0
            stability_class = None
        was_cooling_down = is_cooling_down

        if has_hands:
            hand_lost_counter = 0
            buffer_raw_hands.append(detected_hands)
            if len(buffer_raw_hands) > max_buffer:
                buffer_raw_hands.pop(0)  # FIFO rolling window

            frame_step += 1

            if not is_cooling_down and len(buffer_raw_hands) >= min_segment_frames:
                if frame_step % cadence_frames == 0:
                    trigger_eval = True
        else:
            if len(buffer_raw_hands) > 0:
                hand_lost_counter += 1
                if hand_lost_counter >= 5:
                    if not is_cooling_down and len(buffer_raw_hands) >= min_segment_frames:
                        trigger_eval = True
                    else:
                        buffer_raw_hands = []
                        hand_lost_counter = 0
                        prev_smoothed_probs = None
                        stability_count = 0
                        stability_class = None
            else:
                prev_smoothed_probs = None
                stability_count = 0
                stability_class = None

        # Execute gesture evaluation
        if trigger_eval:
            if len(buffer_raw_hands) >= min_segment_frames:
                seq = process_segment_v2(buffer_raw_hands)
                raw_preds = model.predict(seq[np.newaxis, ...], verbose=0)[0]
                
                # Temporal Probability Smoothing (EMA 0.65 / 0.35)
                if prev_smoothed_probs is not None and len(prev_smoothed_probs) == len(raw_preds):
                    preds = 0.65 * raw_preds + 0.35 * np.array(prev_smoothed_probs)
                else:
                    preds = raw_preds.copy()
                prev_smoothed_probs = preds.tolist()
                current_probs = preds.tolist()
                
                best_idx = int(np.argmax(preds))
                best_conf = float(preds[best_idx])
                best_class = classes[best_idx]

                if best_conf >= threshold and best_class != "_OTHER_":
                    if best_class == stability_class:
                        stability_count += 1
                    else:
                        stability_class = best_class
                        stability_count = 1

                    # Stability rule N=2 (achieved across consecutive cadence evaluations)
                    if stability_count >= 2:
                        last_candidate = best_class
                        last_confidence = best_conf
                        candidate_confirmed = True
                        last_accepted_time = time.time()
                        # Streak reset & cooldown: flush buffer so same gesture doesn't spam
                        buffer_raw_hands = []
                        prev_smoothed_probs = None
                        stability_count = 0
                        stability_class = None
                else:
                    stability_count = 0
                    candidate_confirmed = False

            if not has_hands:
                buffer_raw_hands = []
                prev_smoothed_probs = None
                hand_lost_counter = 0

        # --- UI Overlay Rendering ---
        # 1. Top status bar
        cv2.rectangle(frame, (0, 0), (w, 55), (20, 20, 25), -1)
        cv2.putText(frame, "SignMedic | BISINDO Live Triage Gesture Recognition (Sweet Spot)", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.72, (255, 255, 255), 2)
        cv2.putText(frame, "Tekan 'q' untuk keluar", (w - 240, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1)

        # 2. Bottom info bar
        cv2.rectangle(frame, (0, h - 110), (w, h), (20, 20, 25), -1)
        
        # Buffer indicator
        buf_len = len(buffer_raw_hands)
        buf_ratio = min(1.0, buf_len / max_buffer)
        bar_w = 260
        bar_h = 14
        bar_x = 20
        bar_y = h - 75
        cv2.putText(frame, f"Jendela Gerakan: {buf_len}/{max_buffer} frame", (bar_x, bar_y - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (60, 60, 60), 1)
        if buf_len > 0:
            fill_color = (0, 200, 255) if buf_len < max_buffer else (0, 100, 255)
            cv2.rectangle(frame, (bar_x, bar_y), (bar_x + int(bar_w * buf_ratio), bar_y + bar_h), fill_color, -1)

        # Hand detection status text
        now = time.time()
        if (now - last_accepted_time) < cooldown_seconds:
            cv2.putText(frame, "Jeda Cooldown anti-spam aktif...",
                        (bar_x, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 180, 50), 1)
        elif has_hands:
            cv2.putText(frame, f"Tangan Terdeteksi ({len(detected_hands)}) - Evaluasi bergulir aktif (~400ms)...",
                        (bar_x, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 128), 1)
        else:
            cv2.putText(frame, "Arahkan tangan ke kamera untuk mulai berisyarat...",
                        (bar_x, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (140, 140, 140), 1)

        # 3. Candidate Result Box (Center Bottom)
        cand_x = 360
        cand_y = h - 95
        cv2.rectangle(frame, (cand_x, cand_y), (cand_x + 380, h - 15), (35, 35, 42), -1)
        cv2.rectangle(frame, (cand_x, cand_y), (cand_x + 380, h - 15),
                      (0, 220, 100) if candidate_confirmed else (80, 80, 80), 2)

        if candidate_confirmed and last_candidate:
            cv2.putText(frame, f"KANDIDAT: {last_candidate}", (cand_x + 15, cand_y + 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 255, 128), 2)
            cv2.putText(frame, f"Keyakinan: {last_confidence * 100:.1f}% (Terkonfirmasi N=2)",
                        (cand_x + 15, cand_y + 65), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 220, 220), 1)
        elif stability_count == 1 and stability_class:
            cv2.putText(frame, f"Deteksi: {stability_class}...", (cand_x + 15, cand_y + 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 200, 255), 2)
            cv2.putText(frame, "Memvalidasi frame bergulir...", (cand_x + 15, cand_y + 65),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)
        else:
            cv2.putText(frame, "KANDIDAT: [Belum Ada]", (cand_x + 15, cand_y + 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (120, 120, 120), 1)
            cv2.putText(frame, f"Ambang batas: >= {threshold * 100:.0f}%",
                        (cand_x + 15, cand_y + 65), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (120, 120, 120), 1)

        # 4. Right side: Live Probability Bars for all 11 classes
        panel_w = 270
        panel_x = w - panel_w - 15
        panel_y = 65
        panel_h = 360
        cv2.rectangle(frame, (panel_x, panel_y), (panel_x + panel_w, panel_y + panel_h), (25, 25, 30), -1)
        cv2.rectangle(frame, (panel_x, panel_y), (panel_x + panel_w, panel_y + panel_h), (60, 60, 70), 1)
        cv2.putText(frame, "Probabilitas 11 Kelas:", (panel_x + 12, panel_y + 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (220, 220, 220), 1)

        for i, cname in enumerate(classes):
            prob = current_probs[i] if i < len(current_probs) else 0.0
            row_y = panel_y + 48 + (i * 27)
            
            # Label
            is_winner = (i == int(np.argmax(current_probs))) and (prob >= threshold)
            txt_col = (0, 255, 128) if is_winner else (200, 200, 200)
            cv2.putText(frame, f"{cname:<13}", (panel_x + 10, row_y + 11),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, txt_col, 1)

            # Mini bar
            b_x = panel_x + 130
            b_w = 80
            b_h = 10
            cv2.rectangle(frame, (b_x, row_y), (b_x + b_w, row_y + b_h), (50, 50, 50), -1)
            bar_color = (0, 230, 115) if is_winner else (180, 140, 60)
            cv2.rectangle(frame, (b_x, row_y), (b_x + int(b_w * prob), row_y + b_h), bar_color, -1)

            # Percentage text
            cv2.putText(frame, f"{prob * 100:.0f}%", (b_x + b_w + 8, row_y + 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, txt_col, 1)

        # FPS indicator
        fps = 1.0 / (time.time() - t_start + 1e-6)
        t_start = time.time()
        fps_history.append(fps)
        if len(fps_history) > 30:
            fps_history.pop(0)
        avg_fps = sum(fps_history) / len(fps_history)
        cv2.putText(frame, f"FPS: {avg_fps:.1f}", (w - 110, h - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 200), 1)

        # Display window
        cv2.imshow("SignMedic - BISINDO Realtime Gesture Recognition", frame)
        frame_idx += 1

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:  # 'q' or ESC
            break

    cap.release()
    cv2.destroyAllWindows()
    detector.close()
    print("Webcam session closed successfully.")


if __name__ == "__main__":
    main()
