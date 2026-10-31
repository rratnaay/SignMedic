"""
Generate parity_fixture.json for cross-language validation between Python and TypeScript.
Validates:
1. Per-segment landmark processing (FEATURE_SPEC v2.0.0).
2. End-to-end 7-class model forward pass probabilities within 1e-2 tolerance.
"""

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import json
import numpy as np
import tf_keras as keras

from extract_landmarks import process_segment_v2, FEATURE_DIM, TARGET_T


class MockLandmark:
    def __init__(self, x, y, z):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)


def create_mock_sequence_segment():
    """
    Creates a deterministic 2-frame segment where:
    Slot 0: wrist at (0.5, 0.4), index tip moving up (active hand).
    Slot 1: wrist at (0.2, 0.8), stationary at bottom left (idle table hand).
    Under FEATURE_SPEC v2.0.0, Slot 1 is suppressed because it's stationary and lower by > 0.12.
    """
    segment = []
    for f in range(5):
        # Active hand
        hand_act = [MockLandmark(0.50 + (f * 0.02), 0.40 - (f * 0.02), 0.0)]
        for i in range(1, 21):
            if i == 8:
                hand_act.append(MockLandmark(0.50 + (f * 0.03), 0.30 - (f * 0.03), 0.0))
            elif i == 9:
                hand_act.append(MockLandmark(0.51 + (f * 0.02), 0.35 - (f * 0.02), 0.0))
            else:
                hand_act.append(MockLandmark(0.48 + (i * 0.005), 0.38 - (i * 0.005), 0.0))

        # Idle table hand (stationary at bottom left)
        hand_idle = [MockLandmark(0.20, 0.82, 0.0)]
        for i in range(1, 21):
            if i == 8:
                hand_idle.append(MockLandmark(0.20, 0.77, 0.0))
            elif i == 9:
                hand_idle.append(MockLandmark(0.21, 0.78, 0.0))
            else:
                hand_idle.append(MockLandmark(0.19 + (i * 0.002), 0.80, 0.0))

        segment.append([hand_idle, hand_act])

    return segment


def main():
    model_path = os.path.join(os.path.dirname(__file__), "final_model.h5")
    data_path = os.path.join(os.path.dirname(__file__), "data", "processed", "dataset.npz")
    
    mock_segment = create_mock_sequence_segment()
    expected_processed_seq = process_segment_v2(mock_segment)
    
    raw_segment_json = [
        [[{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand] for hand in frame]
        for frame in mock_segment
    ]
    
    data = np.load(data_path)
    X = data["X"]
    y = data["y"]
    classes = list(data["target_classes"]) + ["_OTHER_"]
    
    sample_seq = X[0].astype(np.float32)
    true_label_idx = int(y[0])
    true_gloss = classes[true_label_idx]
    
    model = keras.models.load_model(model_path)
    probs = model.predict(sample_seq[np.newaxis, ...], verbose=0)[0].tolist()
    pred_label_idx = int(np.argmax(probs))
    pred_gloss = classes[pred_label_idx]
    
    fixture = {
        "description": "SignMedic ML Parity Fixture v2.0.0: Python vs TypeScript Browser Engine",
        "normalization_version": "2.0.0",
        "num_classes": 7,
        "classes": classes,
        "tolerance": {
            "feature_max_diff": 1e-3,
            "probability_max_diff": 1e-2
        },
        "segment_processing_test": {
            "raw_segment_hands": raw_segment_json,
            "expected_processed_sequence": expected_processed_seq.tolist()
        },
        "sequence_inference_test": {
            "sample_input_sequence": sample_seq.tolist(),
            "expected_probabilities": probs,
            "expected_predicted_class_index": pred_label_idx,
            "expected_predicted_class_name": pred_gloss,
            "ground_truth_class_index": true_label_idx,
            "ground_truth_class_name": true_gloss
        }
    }
    
    out_ml = os.path.join(os.path.dirname(__file__), "parity_fixture.json")
    with open(out_ml, "w", encoding="utf-8") as f:
        json.dump(fixture, f, indent=2)
    print(f"Saved fixture to {out_ml}")
    
    web_tests_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "src", "__tests__"))
    os.makedirs(web_tests_dir, exist_ok=True)
    out_web = os.path.join(web_tests_dir, "parity_fixture.json")
    with open(out_web, "w", encoding="utf-8") as f:
        json.dump(fixture, f, indent=2)
    print(f"Saved fixture to {out_web}")


if __name__ == "__main__":
    main()
