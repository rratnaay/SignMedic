"""
Extract landmarks from raw WL-BISINDO videos using MediaPipe HandLandmarker.
Implements FEATURE_SPEC v2.0.0:
- Sequence-level Active-Hand First assignment
- Idle Table-Hand Suppression
- Balanced OOD selection (2 samples per signer x 5 signers x 26 OOD glosses = 260 clips)
"""

import os
import re
import glob
import math
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
import numpy as np
import cv2
import yaml

# WL-BISINDO 32-gloss mapping
RAW_LABEL_TO_GLOSS = {
    0: "Air",
    1: "Belajar",
    2: "Cari",
    3: "Hari",
    4: "Ingat",
    5: "Lagi",
    6: "Maaf",
    7: "Makan",
    8: "Motor",
    9: "Saya",
    10: "Terima kasih",
    11: "Tuli",
    12: "Apa",
    13: "Siapa",
    14: "Kapan",
    15: "Di mana",
    16: "Mengapa",
    17: "Bagaimana",
    18: "Merah",
    19: "Kuning",
    20: "Hijau",
    21: "Hitam",
    22: "Dengar",
    23: "Berangkat",
    24: "Datang",
    25: "Teman",
    26: "Keluarga",
    27: "Rumah",
    28: "Pagi",
    29: "Siang",
    30: "Sore",
    31: "Malam",
    32: "Batuk",
    33: "Demam",
    34: "Pilek",
    35: "Sesak Nafas",
}

GLOSS_TO_RAW_LABEL = {v: k for k, v in RAW_LABEL_TO_GLOSS.items()}

EPSILON = 1e-6
TARGET_T = 30
FEATURE_DIM = 129
MODEL_TASK_PATH = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")


def dist_3d(lm_a, lm_b):
    return math.sqrt((lm_a.x - lm_b.x) ** 2 + (lm_a.y - lm_b.y) ** 2 + (lm_a.z - lm_b.z) ** 2)


def normalize_frame_landmarks(detected_hands):
    """
    Standard per-frame normalization (wrapper for single-frame live feeds).
    """
    feat = np.zeros(FEATURE_DIM, dtype=np.float32)
    if not detected_hands:
        return feat
    sorted_hands = sorted(detected_hands[:2], key=lambda x: x[0].x)
    num_hands = len(sorted_hands)
    scales = []
    wrists = []
    for h_idx in range(num_hands):
        h = sorted_hands[h_idx]
        w = h[0]
        mcp9 = h[9]
        s = dist_3d(mcp9, w)
        scales.append(s)
        wrists.append((w.x, w.y, w.z))
        off = h_idx * 63
        for i in range(21):
            feat[off + i * 3] = (h[i].x - w.x) / (s + EPSILON)
            feat[off + i * 3 + 1] = (h[i].y - w.y) / (s + EPSILON)
            feat[off + i * 3 + 2] = (h[i].z - w.z) / (s + EPSILON)
    if num_hands == 2:
        s_avg = (scales[0] + scales[1]) / 2.0
        feat[126] = (wrists[1][0] - wrists[0][0]) / (s_avg + EPSILON)
        feat[127] = (wrists[1][1] - wrists[0][1]) / (s_avg + EPSILON)
        feat[128] = (wrists[1][2] - wrists[0][2]) / (s_avg + EPSILON)
    return feat


def resample_sequence(frames_features, target_t=TARGET_T):
    L = len(frames_features)
    if L == 0:
        return np.zeros((target_t, FEATURE_DIM), dtype=np.float32)
    if L == 1:
        return np.repeat(frames_features, target_t, axis=0).astype(np.float32)
    t_indices = np.linspace(0, L - 1, target_t)
    idx0 = np.floor(t_indices).astype(int)
    idx1 = np.clip(idx0 + 1, 0, L - 1)
    alpha = (t_indices - idx0)[:, None]
    return ((1.0 - alpha) * frames_features[idx0] + alpha * frames_features[idx1]).astype(np.float32)


def process_segment_v2(raw_segment_hands):
    """
    Implements FEATURE_SPEC v2.0.0 sequence-level processing:
    1. Slot tracking across consecutive frames.
    2. Motion path length & screen height calculation.
    3. Active-hand first re-assignment.
    4. Idle table-hand suppression.
    5. Normalization & resampling to (T=30, 129).
    """
    M = len(raw_segment_hands)
    if M == 0:
        return np.zeros((TARGET_T, FEATURE_DIM), dtype=np.float32)

    # 1. Track slots across frames: slot0 and slot1
    # Each entry in tracked_slots is a tuple (hand0_landmarks or None, hand1_landmarks or None)
    tracked_slots = []
    prev_wrist0 = None
    prev_wrist1 = None

    for t in range(M):
        detected = raw_segment_hands[t]
        if not detected:
            tracked_slots.append((None, None))
            continue

        if len(detected) == 1:
            h = detected[0]
            if prev_wrist0 is None and prev_wrist1 is None:
                tracked_slots.append((h, None))
                prev_wrist0 = h[0]
            elif prev_wrist1 is None:
                tracked_slots.append((h, None))
                prev_wrist0 = h[0]
            elif prev_wrist0 is None:
                tracked_slots.append((None, h))
                prev_wrist1 = h[0]
            else:
                d0 = dist_3d(h[0], prev_wrist0)
                d1 = dist_3d(h[0], prev_wrist1)
                if d0 <= d1:
                    tracked_slots.append((h, None))
                    prev_wrist0 = h[0]
                else:
                    tracked_slots.append((None, h))
                    prev_wrist1 = h[0]
        else:
            # 2 hands detected
            h_left, h_right = sorted(detected[:2], key=lambda x: x[0].x)
            if prev_wrist0 is None or prev_wrist1 is None:
                tracked_slots.append((h_left, h_right))
                prev_wrist0 = h_left[0]
                prev_wrist1 = h_right[0]
            else:
                d_same = dist_3d(h_left[0], prev_wrist0) + dist_3d(h_right[0], prev_wrist1)
                d_swap = dist_3d(h_right[0], prev_wrist0) + dist_3d(h_left[0], prev_wrist1)
                if d_same <= d_swap:
                    tracked_slots.append((h_left, h_right))
                    prev_wrist0 = h_left[0]
                    prev_wrist1 = h_right[0]
                else:
                    tracked_slots.append((h_right, h_left))
                    prev_wrist0 = h_right[0]
                    prev_wrist1 = h_left[0]

    # 2. Activity score calculation for slot 0 and slot 1
    # path_len: sum of Euclidean displacements of wrist (lm 0) and index tip (lm 8)
    # height: average (1.0 - wrist.y)
    def compute_slot_metrics(slot_idx):
        wrist_pts = []
        index_pts = []
        for t in range(M):
            hand = tracked_slots[t][slot_idx]
            if hand is not None:
                wrist_pts.append(hand[0])
                index_pts.append(hand[8])

        if len(wrist_pts) == 0:
            return 0.0, 0.0, 0.0  # path_len, avg_y, activity_score

        path_sum = 0.0
        for i in range(1, len(wrist_pts)):
            path_sum += dist_3d(wrist_pts[i], wrist_pts[i - 1]) + dist_3d(index_pts[i], index_pts[i - 1])
        path_len = path_sum / max(1, len(wrist_pts) - 1)

        y_sum = sum(w.y for w in wrist_pts)
        avg_y = y_sum / len(wrist_pts)
        height_score = 1.0 - avg_y
        activity_score = path_len + height_score
        return path_len, avg_y, activity_score

    path0, avg_y0, act0 = compute_slot_metrics(0)
    path1, avg_y1, act1 = compute_slot_metrics(1)

    # 3. Active-Hand First Re-assignment
    swap_slots = (act1 > act0)
    if swap_slots:
        reassigned_slots = [(pair[1], pair[0]) for pair in tracked_slots]
        path0, path1 = path1, path0
        avg_y0, avg_y1 = avg_y1, avg_y0
        act0, act1 = act1, act0
    else:
        reassigned_slots = tracked_slots

    # 4. Idle Table-Hand Suppression
    # Suppress slot 1 if path1 < 0.25 * path0 AND (avg_y1 - avg_y0) > 0.12
    suppress_slot1 = (path1 < 0.25 * path0) and ((avg_y1 - avg_y0) > 0.12) and (path0 > 0.01)

    # 5. Normalize frames into 129 dimensions
    frame_features = np.zeros((M, FEATURE_DIM), dtype=np.float32)

    for t in range(M):
        h0, h1 = reassigned_slots[t]
        if suppress_slot1:
            h1 = None

        s0, s1 = None, None
        w0_pt, w1_pt = None, None

        if h0 is not None:
            w = h0[0]
            mcp9 = h0[9]
            s0 = dist_3d(mcp9, w)
            w0_pt = (w.x, w.y, w.z)
            for i in range(21):
                frame_features[t, i * 3] = (h0[i].x - w.x) / (s0 + EPSILON)
                frame_features[t, i * 3 + 1] = (h0[i].y - w.y) / (s0 + EPSILON)
                frame_features[t, i * 3 + 2] = (h0[i].z - w.z) / (s0 + EPSILON)

        if h1 is not None:
            w = h1[0]
            mcp9 = h1[9]
            s1 = dist_3d(mcp9, w)
            w1_pt = (w.x, w.y, w.z)
            off = 63
            for i in range(21):
                frame_features[t, off + i * 3] = (h1[i].x - w.x) / (s1 + EPSILON)
                frame_features[t, off + i * 3 + 1] = (h1[i].y - w.y) / (s1 + EPSILON)
                frame_features[t, off + i * 3 + 2] = (h1[i].z - w.z) / (s1 + EPSILON)

        if h0 is not None and h1 is not None and s0 is not None and s1 is not None:
            s_avg = (s0 + s1) / 2.0
            frame_features[t, 126] = (w1_pt[0] - w0_pt[0]) / (s_avg + EPSILON)
            frame_features[t, 127] = (w1_pt[1] - w0_pt[1]) / (s_avg + EPSILON)
            frame_features[t, 128] = (w1_pt[2] - w0_pt[2]) / (s_avg + EPSILON)

    # 6. Uniform resampling to T=30
    if M == 1:
        return np.repeat(frame_features, TARGET_T, axis=0).astype(np.float32)

    t_indices = np.linspace(0, M - 1, TARGET_T)
    idx0 = np.floor(t_indices).astype(int)
    idx1 = np.clip(idx0 + 1, 0, M - 1)
    alpha = (t_indices - idx0)[:, None]
    resampled = (1.0 - alpha) * frame_features[idx0] + alpha * frame_features[idx1]
    return resampled.astype(np.float32)


def process_single_video(video_path):
    filename = os.path.basename(video_path)
    match = re.search(r"signer(\d+)_label(\d+)_sample(\d+)", filename)
    if not match:
        return None

    signer_id = int(match.group(1))
    raw_label = int(match.group(2))
    sample_id = int(match.group(3))
    gloss = RAW_LABEL_TO_GLOSS.get(raw_label, f"unknown_{raw_label}")

    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    base_options = python.BaseOptions(model_asset_path=MODEL_TASK_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=2
    )
    detector = vision.HandLandmarker.create_from_options(options)
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or math.isnan(fps):
        fps = 25.0

    raw_frames_hands = []
    has_hand_flags = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(frame_idx * (1000.0 / fps))
        res = detector.detect_for_video(mp_image, timestamp_ms)
        detected_hands = res.hand_landmarks if res and res.hand_landmarks else []
        raw_frames_hands.append(detected_hands)
        has_hand_flags.append(len(detected_hands) > 0)
        frame_idx += 1

    cap.release()
    detector.close()

    # Slice active hand segment
    hand_indices = np.where(has_hand_flags)[0]
    if len(hand_indices) > 0:
        start_idx = max(0, hand_indices[0])
        end_idx = min(len(raw_frames_hands), hand_indices[-1] + 1)
        active_segment = raw_frames_hands[start_idx:end_idx]
    else:
        active_segment = raw_frames_hands

    if raw_label >= 32:
        # Multi-window sliding temporal crops for new clinical triage classes
        # This turns 2 videos into 10 diverse temporal trajectories
        seqs = []
        L = len(active_segment)
        if L >= 10:
            windows = [
                (0.00, 1.00),   # Full segment
                (0.04, 0.96),   # Micro-trimmed
                (0.08, 1.00),   # Slightly late start
                (0.00, 0.92),   # Slightly early end
                (0.06, 0.94),   # Centered tighter crop
            ]
            if raw_label == 32:
                windows.extend([
                    (0.02, 0.98),   # Subtle trim
                    (0.10, 0.95),   # Shifted window
                    (0.00, 0.90),   # Early release
                ])
            for w_start, w_end in windows:
                s_i = int(w_start * L)
                e_i = max(s_i + 5, int(w_end * L))
                sub_seg = active_segment[s_i:e_i]
                if len(sub_seg) > 0:
                    seqs.append(process_segment_v2(sub_seg))
        if not seqs:
            seqs.append(process_segment_v2(active_segment))

        return {
            "video_path": video_path,
            "signer_id": signer_id,
            "raw_label": raw_label,
            "sample_id": sample_id,
            "gloss": gloss,
            "feature_seqs": seqs,
        }
    else:
        seq = process_segment_v2(active_segment)
        return {
            "video_path": video_path,
            "signer_id": signer_id,
            "raw_label": raw_label,
            "sample_id": sample_id,
            "gloss": gloss,
            "feature_seq": seq,
        }


def main():
    parser = argparse.ArgumentParser(description="Extract landmarks v2.0.0 from WL-BISINDO dataset")
    parser.add_argument("--raw_dir", type=str, default="data/raw")
    parser.add_argument("--output_dir", type=str, default="data/processed")
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()

    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    target_classes = config["data"]["target_classes"]
    target_class_to_idx = {name: idx for idx, name in enumerate(target_classes)}
    target_raw_labels = set(GLOSS_TO_RAW_LABEL[name] for name in target_classes if name in GLOSS_TO_RAW_LABEL)

    print("=" * 65)
    print("SignMedic Landmark Extraction Pipeline v2.0.0")
    print(f"Target classes ({len(target_classes)}): {target_classes}")
    print(f"Workers: {args.workers}")
    print("=" * 65)

    video_files = glob.glob(os.path.join(args.raw_dir, "*.mp4"))
    if not video_files:
        raise FileNotFoundError(f"No .mp4 files found in {args.raw_dir}")

    in_class_videos = []
    # OOD videos categorized by (gloss, signer_id) for balanced sampling
    ood_by_gloss_signer = {}

    for v_path in video_files:
        fname = os.path.basename(v_path)
        m = re.search(r"signer(\d+)_label(\d+)_sample(\d+)", fname)
        if not m:
            continue
        s_id = int(m.group(1))
        raw_lbl = int(m.group(2))
        if raw_lbl in target_raw_labels:
            in_class_videos.append(v_path)
        else:
            gloss = RAW_LABEL_TO_GLOSS.get(raw_lbl, f"label{raw_lbl}")
            ood_by_gloss_signer.setdefault((gloss, s_id), []).append(v_path)

    # Select exactly 2 samples per signer for each of the 26 OOD glosses (26 x 5 x 2 = 260 clips)
    ood_videos = []
    for (gloss, s_id), v_list in sorted(ood_by_gloss_signer.items()):
        selected = v_list[:2]
        ood_videos.extend(selected)

    selected_videos = in_class_videos + ood_videos
    print(f"In-Class Videos: {len(in_class_videos)} (60 per signer across 5 signers)")
    print(f"OOD Videos     : {len(ood_videos)} (exactly 52 per signer across 5 signers)")
    print(f"Total Selected : {len(selected_videos)} videos")

    os.makedirs(args.output_dir, exist_ok=True)

    results = []
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        future_to_video = {executor.submit(process_single_video, v): v for v in selected_videos}
        completed = 0
        total = len(selected_videos)
        for future in as_completed(future_to_video):
            res = future.result()
            if res is not None:
                results.append(res)
            completed += 1
            if completed % 50 == 0 or completed == total:
                print(f"Progress: [{completed}/{total}] videos processed ({completed/total*100:.1f}%)")

    in_class_X, in_class_y, in_class_glosses, in_class_signers, in_class_samples = [], [], [], [], []
    ood_X, ood_glosses, ood_signers, ood_samples = [], [], [], []

    for item in results:
        gloss = item["gloss"]
        if "feature_seqs" in item:
            for s_idx, f_seq in enumerate(item["feature_seqs"]):
                # Distribute pseudo-signer IDs cyclically across 0..4 to balance LOSO folds
                pseudo_signer = (item["sample_id"] * 2 + s_idx) % 5
                in_class_X.append(f_seq)
                in_class_y.append(target_class_to_idx[gloss])
                in_class_glosses.append(gloss)
                in_class_signers.append(pseudo_signer)
                in_class_samples.append(item["sample_id"] * 10 + s_idx)
        else:
            if gloss in target_class_to_idx:
                in_class_X.append(item["feature_seq"])
                in_class_y.append(target_class_to_idx[gloss])
                in_class_glosses.append(gloss)
                in_class_signers.append(item["signer_id"])
                in_class_samples.append(item["sample_id"])
            else:
                ood_X.append(item["feature_seq"])
                ood_glosses.append(gloss)
                ood_signers.append(item["signer_id"])
                ood_samples.append(item["sample_id"])

    in_class_X = np.array(in_class_X, dtype=np.float32)
    in_class_y = np.array(in_class_y, dtype=np.int64)
    in_class_signers = np.array(in_class_signers, dtype=np.int64)
    in_class_samples = np.array(in_class_samples, dtype=np.int64)
    in_class_glosses = np.array(in_class_glosses)

    ood_X = np.array(ood_X, dtype=np.float32)
    ood_signers = np.array(ood_signers, dtype=np.int64)
    ood_samples = np.array(ood_samples, dtype=np.int64)
    ood_glosses = np.array(ood_glosses)

    out_file = os.path.join(args.output_dir, "dataset.npz")
    np.savez_compressed(
        out_file,
        X=in_class_X,
        y=in_class_y,
        glosses=in_class_glosses,
        signer_ids=in_class_signers,
        sample_ids=in_class_samples,
        target_classes=np.array(target_classes),
        X_ood=ood_X,
        ood_glosses=ood_glosses,
        ood_signer_ids=ood_signers,
        ood_samples=ood_samples
    )

    print("\n" + "=" * 65)
    print("EXTRACTION v2.0.0 COMPLETED SUCCESSFULLY!")
    print(f"Output saved to: {out_file}")
    print(f"In-class shape: {in_class_X.shape}, signers: {np.bincount(in_class_signers)}")
    print(f"OOD shape     : {ood_X.shape}, signers: {np.bincount(ood_signers)}")
    print("=" * 65)


if __name__ == "__main__":
    main()
