"""
SignMedic - Video File Gesture Recognition Tester (v2.0.0)
Tests the gesture recognition pipeline on video files.
Supports FEATURE_SPEC v2.0.0 and 11-class output with '_OTHER_' rejection.
"""

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import re
import glob
import random
import argparse
import json
import yaml
import cv2
import numpy as np
import tf_keras as keras

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from extract_landmarks import (
    process_segment_v2,
    FEATURE_DIM,
    TARGET_T,
    RAW_LABEL_TO_GLOSS,
    GLOSS_TO_RAW_LABEL,
    MODEL_TASK_PATH
)
from test_webcam import draw_hand_skeleton


def test_single_video(video_path, model, target_classes, threshold, show_gui=True):
    if not os.path.exists(video_path):
        print(f"Error: Video file not found: {video_path}")
        return

    filename = os.path.basename(video_path)
    print("\n" + "=" * 65)
    print(f"Testing Video: {filename}")
    
    match = re.search(r"signer(\d+)_label(\d+)_sample(\d+)", filename)
    ground_truth = None
    if match:
        signer_id = int(match.group(1))
        raw_label = int(match.group(2))
        sample_id = int(match.group(3))
        ground_truth = RAW_LABEL_TO_GLOSS.get(raw_label, f"label_{raw_label}")
        print(f"Ground Truth : {ground_truth} (Signer {signer_id}, Sample {sample_id})")
        if ground_truth not in target_classes:
            print("Note         : This is an OUT-OF-CLASS gesture (should be rejected/classified as _OTHER_)")
    print("=" * 65)

    base_options = python.BaseOptions(model_asset_path=MODEL_TASK_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=2
    )
    detector = vision.HandLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or np.isnan(fps):
        fps = 25.0

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Video Stats  : {total_frames} frames @ {fps:.1f} FPS")

    raw_frames_hands = []
    has_hand_flags = []
    recorded_frames = []
    frame_idx = 0

    print("Extracting landmarks with FEATURE_SPEC v2.0.0...")
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(frame_idx * (1000.0 / fps))

        res = detector.detect_for_video(mp_image, timestamp_ms)
        hands = res.hand_landmarks if res and res.hand_landmarks else []
        raw_frames_hands.append(hands)
        has_hand_flags.append(len(hands) > 0)

        if show_gui:
            h, w, _ = frame.shape
            display_frame = frame.copy()
            for hand in hands:
                draw_hand_skeleton(display_frame, hand, w, h)
            recorded_frames.append(display_frame)

        frame_idx += 1

    cap.release()
    detector.close()

    hand_indices = np.where(has_hand_flags)[0]
    if len(hand_indices) > 0:
        start_idx = max(0, hand_indices[0])
        end_idx = min(len(raw_frames_hands), hand_indices[-1] + 1)
        active_segment = raw_frames_hands[start_idx:end_idx]
        print(f"Active hand detected from frame {start_idx} to {end_idx} ({len(active_segment)} frames)")
    else:
        active_segment = raw_frames_hands
        print("No hands detected in video!")

    seq = process_segment_v2(active_segment)
    
    # Model inference (11 classes)
    probs = model.predict(seq[np.newaxis, ...], verbose=0)[0]
    all_class_names = target_classes + ["_OTHER_"]
    pred_idx = int(np.argmax(probs))
    pred_conf = float(probs[pred_idx])
    pred_class = all_class_names[pred_idx]
    
    # Acceptance check: accepted only if not _OTHER_ and target confidence >= threshold
    n_target = len(target_classes)
    max_target_conf = float(np.max(probs[:n_target]))
    is_accepted = (pred_idx < n_target) and (max_target_conf >= threshold)

    print("\n--- HASIL PREDIKSI MODEL v2.0.0 ---")
    print(f"Kelas Terprediksi : {pred_class}")
    print(f"Keyakinan (Conf)  : {pred_conf * 100:.2f}%")
    print(f"Ambang Batas      : {threshold * 100:.0f}%")
    print(f"Status Keputusan  : {'[LOLOS THRESHOLD - DITERIMA KANDIDAT]' if is_accepted else '[DITOLAK / DIALIHKAN KE PAPAN VISUAL]'}")

    if ground_truth:
        if ground_truth in target_classes:
            is_correct = (pred_class == ground_truth) and is_accepted
            print(f"Kebenaran Prediksi: {'BENAR (Sesuai Ground Truth)' if is_correct else 'SALAH / RAGU'}")
        else:
            is_correct_rejection = not is_accepted
            print(f"Uji Penolakan OOD : {'BERHASIL DITOLAK (Aman)' if is_correct_rejection else 'GAGAL DITOLAK (False Positive)'}")

    print("\n--- PERINCIAN SEMUA KELAS ---")
    for idx, cname in enumerate(all_class_names):
        bar = "#" * int(probs[idx] * 30)
        mark = " <-- TERPILIH" if idx == pred_idx else ""
        print(f"  {cname:<14} : {probs[idx] * 100:6.2f}% | {bar}{mark}")
    print("=" * 65)

    if show_gui and recorded_frames:
        print("\nMemutar pratinjau video ber-skeleton... (Tekan 'q' untuk keluar)")
        cv2.namedWindow("SignMedic Video Tester", cv2.WINDOW_AUTOSIZE)
        loop = True
        while loop:
            for f in recorded_frames:
                fh, fw, _ = f.shape
                cv2.rectangle(f, (0, 0), (fw, 60), (20, 20, 25), -1)
                color = (0, 255, 128) if is_accepted else (0, 165, 255)
                status_str = f"PREDIKSI: {pred_class} ({pred_conf*100:.1f}%)" if is_accepted else f"DITOLAK: {pred_class} ({pred_conf*100:.1f}%)"
                cv2.putText(f, status_str, (15, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.85, color, 2)
                cv2.putText(f, "Tekan 'q' untuk selesai", (fw - 240, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
                cv2.imshow("SignMedic Video Tester", f)
                key = cv2.waitKey(int(1000 / fps)) & 0xFF
                if key == ord('q') or key == 27:
                    loop = False
                    break
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Test SignMedic v2.0.0 ML Model on Video File")
    parser.add_argument("--video", type=str, default=None)
    parser.add_argument("--class_name", type=str, default=None)
    parser.add_argument("--no_gui", action="store_true")
    args = parser.parse_args()

    model_path = os.path.join(os.path.dirname(__file__), "final_model.h5")
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    
    classes = ["Air", "Makan", "Saya", "Tuli", "Maaf", "Terima kasih", "Batuk", "Demam", "Pilek", "Sesak Nafas"]
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
            if "data" in cfg and "target_classes" in cfg["data"]:
                classes = list(cfg["data"]["target_classes"])
                
    threshold = 0.85

    model = keras.models.load_model(model_path)
    target_video = args.video
    if not target_video:
        if args.class_name:
            raw_lbl = GLOSS_TO_RAW_LABEL.get(args.class_name)
            if raw_lbl is None:
                print(f"Error: Class '{args.class_name}' is not recognized.")
                return
            candidates = glob.glob(os.path.join(os.path.dirname(__file__), "data", "raw", f"*_label{raw_lbl}_*.mp4"))
            if not candidates:
                print("No videos found.")
                return
            target_video = random.choice(candidates)
        else:
            candidates = glob.glob(os.path.join(os.path.dirname(__file__), "data", "raw", "*_label10_sample1.mp4"))
            target_video = candidates[0] if candidates else None

    test_single_video(target_video, model, classes, threshold, show_gui=not args.no_gui)


if __name__ == "__main__":
    main()
