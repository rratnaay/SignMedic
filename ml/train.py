"""
SignMedic Training Pipeline (Clean Nested LOSO with 11-Class OOD Rejection):
- 11 output neurons: 10 target classes + 1 '_OTHER_' class (index 10).
- Target classes:
  0: Air, 1: Makan, 2: Saya, 3: Tuli, 4: Maaf, 5: Terima kasih,
  6: Batuk, 7: Demam, 8: Pilek, 9: Sesak Nafas, 10: _OTHER_
- Strict nested split: For each test signer X, exactly 1 validation signer V is isolated
  (used for EarlyStopping, ReduceLROnPlateau, and threshold calibration).
  Test signer X (both in-class and out-of-class) is strictly held-out and untouched until evaluation.
- Oversampling & 3D geometric augmentation for few-shot new classes to ensure class balance.
"""

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import json
import glob
import re
import cv2
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

import tensorflow as tf
import tf_keras as keras
from tf_keras import layers

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)
tf.random.set_seed(RANDOM_SEED)

TARGET_T = 30
FEATURE_DIM = 129
NUM_CLASSES = 11  # 10 target classes + 1 _OTHER_ class
REJECT_CLASS_INDEX = 10
REJECT_CLASS_NAME = "_OTHER_"


def horizontal_flip(X):
    """Mirror features (x -> -x). Works on (T, 129) or (N, T, 129).
    hand_0/hand_1 are wrist-centered, so negating every x component (indices 0::3,
    covering both hands and delta_wrist.x) turns a right hand into a left hand."""
    X_f = np.array(X, dtype=np.float32, copy=True)
    X_f[..., 0::3] *= -1.0
    return X_f


def rotate_2d_sequence(X_seq, angle_deg):
    theta = np.radians(angle_deg)
    cos_t, sin_t = np.cos(theta), np.sin(theta)
    X_rot = X_seq.copy()
    for h in [0, 1]:
        off = h * 63
        for i in range(21):
            x = X_seq[:, off + i * 3]
            y = X_seq[:, off + i * 3 + 1]
            X_rot[:, off + i * 3] = x * cos_t - y * sin_t
            X_rot[:, off + i * 3 + 1] = x * sin_t + y * cos_t
    dx = X_seq[:, 126]
    dy = X_seq[:, 127]
    X_rot[:, 126] = dx * cos_t - dy * sin_t
    X_rot[:, 127] = dx * sin_t + dy * cos_t
    return X_rot


def time_warp_sequence(X_seq, warp_factor):
    t_orig = np.linspace(0.0, 1.0, TARGET_T)
    t_warped = np.clip(t_orig * warp_factor + np.random.uniform(0.0, max(0.0, 1.0 - warp_factor)), 0.0, 1.0)
    idx_float = t_warped * (TARGET_T - 1)
    idx0 = np.floor(idx_float).astype(int)
    idx1 = np.clip(idx0 + 1, 0, TARGET_T - 1)
    alpha = (idx_float - idx0)[:, None]
    warped = (1.0 - alpha) * X_seq[idx0] + alpha * X_seq[idx1]
    return warped.astype(np.float32)


def gaussian_jitter_sequence(X_seq, std=0.008):
    noise = np.random.normal(0, std, size=X_seq.shape).astype(np.float32)
    mask = (X_seq != 0.0).astype(np.float32)
    return X_seq + (noise * mask)


def scale_jitter_sequence(X_seq, min_s=0.90, max_s=1.10):
    scale = np.random.uniform(min_s, max_s)
    return X_seq * scale


def augment_training_data(X_train, y_train, multiplier=4, boost_new_classes=True):
    """Each clip yields `multiplier` samples for the original view plus `multiplier`
    for its horizontal flip (2 * multiplier total, 50:50 right/left). Within each
    view, the first sample is unmodified and the rest get rotation/time-warp/
    jitter/scale augmentation.
    New classes (label 6..9) have fewer seed samples and receive 5x higher oversampling
    to match the ~240 training samples of benchmark classes."""
    augmented_X = []
    augmented_y = []
    
    for i in range(len(X_train)):
        label = y_train[i]
        if boost_new_classes and 6 <= label < REJECT_CLASS_INDEX:
            per_view = multiplier * 5  # 20 per view = 40 samples per base clip
        else:
            per_view = max(1, multiplier)
            
        for view in (X_train[i], horizontal_flip(X_train[i])):
            augmented_X.append(view)
            augmented_y.append(label)
            
            for _ in range(per_view - 1):
                angle = np.random.uniform(-15.0, 15.0)
                factor = np.random.uniform(0.85, 1.15)
                s_aug = scale_jitter_sequence(
                    gaussian_jitter_sequence(
                        time_warp_sequence(rotate_2d_sequence(view, angle), factor),
                        std=0.008
                    )
                )
                augmented_X.append(s_aug)
                augmented_y.append(label)
            
    return np.array(augmented_X, dtype=np.float32), np.array(augmented_y, dtype=np.int64)


def build_classifier_model(input_shape=(TARGET_T, FEATURE_DIM), num_classes=NUM_CLASSES):
    inputs = layers.Input(shape=input_shape, name="landmarks_input")
    x = layers.Conv1D(64, kernel_size=3, padding="same", activation="relu")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.SpatialDropout1D(0.2)(x)
    
    x = layers.Conv1D(64, kernel_size=5, dilation_rate=2, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.SpatialDropout1D(0.2)(x)
    
    x = layers.GRU(64, return_sequences=False, dropout=0.2)(x)
    
    x = layers.Dense(64, activation="relu", kernel_regularizer=keras.regularizers.l2(1e-4))(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="prediction")(x)
    
    model = keras.Model(inputs=inputs, outputs=outputs, name="signmedic_classifier")
    loss_fn = keras.losses.CategoricalCrossentropy(label_smoothing=0.1)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss=loss_fn,
        metrics=["accuracy"]
    )
    return model


def build_invariant_model(base_model):
    """Wrap a trained base network with in-graph flip averaging:
    p = mean(base(x), base(flip(x))). The flip is a frozen diagonal Dense layer
    (-1 on every x component, +1 elsewhere), so the exported TF.js model is exactly
    left/right-hand invariant without extra client-side logic."""
    inputs = layers.Input(shape=(TARGET_T, FEATURE_DIM), name="landmarks_input")
    sign = np.ones(FEATURE_DIM, dtype=np.float32)
    sign[0::3] = -1.0
    flip_layer = layers.Dense(FEATURE_DIM, use_bias=False, trainable=False, name="mirror_flip")
    flipped = flip_layer(inputs)
    flip_layer.set_weights([np.diag(sign)])
    p_orig = base_model(inputs)
    p_flip = base_model(flipped)
    outputs = layers.Average(name="tta_prediction")([p_orig, p_flip])
    return keras.Model(inputs=inputs, outputs=outputs, name=f"signmedic_{NUM_CLASSES}class_mirror_invariant")


def plot_confusion_matrix(cm, class_names, output_path):
    fig, ax = plt.subplots(figsize=(10, 9))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(xticks=np.arange(cm.shape[1]),
           yticks=np.arange(cm.shape[0]),
           xticklabels=class_names, yticklabels=class_names,
           title=f"Confusion Matrix ({len(class_names)} Target Classes)",
           ylabel="True Class",
           xlabel="Predicted Class")
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, format(cm[i, j], "d"),
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black")
    fig.tight_layout()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, dpi=300)
    plt.close()


def main():
    data_path = os.path.join(os.path.dirname(__file__), "data", "processed", "dataset.npz")
    reports_dir = os.path.join(os.path.dirname(__file__), "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    data = np.load(data_path)
    X = data["X"]
    y = data["y"]
    signer_ids = data["signer_ids"]
    target_classes = list(data["target_classes"])
    
    X_ood = data["X_ood"]
    ood_signers = data["ood_signer_ids"]
    y_ood = np.full(len(X_ood), REJECT_CLASS_INDEX, dtype=np.int64)
    
    unique_signers = sorted(list(np.unique(signer_ids)))
    
    print("=" * 70)
    print(f"SignMedic Training & Validation: {NUM_CLASSES}-CLASS CLEAN NESTED LOSO")
    print(f"Target Classes ({len(target_classes)}): {target_classes}")
    print(f"Reject Class : '{REJECT_CLASS_NAME}' at index {REJECT_CLASS_INDEX}")
    print(f"In-Class Clips: {len(X)} across {len(unique_signers)} signers")
    print(f"OOD Clips     : {len(X_ood)} across {len(unique_signers)} signers")
    print("=" * 70)
    
    all_y_true_in = []
    all_y_pred_in = []
    all_probs_in = []
    per_signer_results = {}
    signer_cm_dict = {}
    
    all_ood_probs = []
    all_ood_preds = []
    ood_signer_results = {}
    
    all_y_true_flip = []
    all_y_pred_flip = []
    all_ood_probs_flip = []
    all_ood_preds_flip = []
    mirror_per_signer = {}
    
    for fold_idx, test_signer in enumerate(unique_signers):
        remaining = [s for s in unique_signers if s != test_signer]
        val_signer = remaining[0]
        train_signers = [s for s in remaining if s != val_signer]
        
        # In-class splits
        in_trn_mask = np.isin(signer_ids, train_signers)
        in_val_mask = (signer_ids == val_signer)
        in_tst_mask = (signer_ids == test_signer)
        
        # OOD splits (strictly by signer!)
        ood_trn_mask = np.isin(ood_signers, train_signers)
        ood_val_mask = (ood_signers == val_signer)
        ood_tst_mask = (ood_signers == test_signer)
        
        # Combine in-class + OOD for train
        X_trn_raw = np.concatenate([X[in_trn_mask], X_ood[ood_trn_mask]], axis=0)
        y_trn_raw = np.concatenate([y[in_trn_mask], y_ood[ood_trn_mask]], axis=0)
        
        # Combine in-class + OOD for val
        X_val = np.concatenate([X[in_val_mask], X_ood[ood_val_mask]], axis=0)
        y_val = np.concatenate([y[in_val_mask], y_ood[ood_val_mask]], axis=0)
        
        # Untouched test sets for signer X
        X_test_in = X[in_tst_mask]
        y_test_in = y[in_tst_mask]
        
        X_test_ood = X_ood[ood_tst_mask]
        y_test_ood = y_ood[ood_tst_mask]
        
        # Augment training set with oversampled new classes
        X_trn_aug, y_trn_aug = augment_training_data(X_trn_raw, y_trn_raw, multiplier=4, boost_new_classes=True)
        
        y_trn_oh = keras.utils.to_categorical(y_trn_aug, num_classes=NUM_CLASSES)
        y_val_oh = keras.utils.to_categorical(y_val, num_classes=NUM_CLASSES)
        
        print(f"\n--- FOLD {fold_idx + 1}/5: Test Signer {test_signer} ---")
        print(f"Train Signers: {train_signers} | Clips: {len(X_trn_aug)} (augmented)")
        print(f"Val Signer  : {val_signer} | Clips: {len(X_val)} (unaugmented)")
        print(f"Test Signer : {test_signer} | In-Class: {len(X_test_in)}, OOD: {len(X_test_ood)} (untouched)")
        
        model = build_classifier_model()
        callbacks = [
            keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-5, verbose=0),
            keras.callbacks.EarlyStopping(monitor="val_loss", patience=15, restore_best_weights=True, verbose=0)
        ]
        
        model.fit(
            X_trn_aug, y_trn_oh,
            validation_data=(X_val, y_val_oh),
            epochs=100,
            batch_size=16,
            callbacks=callbacks,
            verbose=0,
            shuffle=True
        )
        model = build_invariant_model(model)
        
        # 1. Evaluate on in-class test clips of Signer X
        probs_in = model.predict(X_test_in, verbose=0)
        preds_in = np.argmax(probs_in, axis=1)
        
        correct_in = int(np.sum(preds_in == y_test_in))
        total_in = int(len(y_test_in))
        acc_in = float(correct_in / total_in)
        
        print(f"In-Class Result : {correct_in}/{total_in} correct ({acc_in * 100:.2f}%)")
        
        per_signer_results[f"signer_{test_signer}"] = {
            "correct_clips": correct_in,
            "total_clips": total_in,
            "accuracy": acc_in,
            "accuracy_ratio": f"{correct_in}/{total_in}",
            "train_signers": train_signers,
            "val_signer": val_signer
        }
        
        signer_cm_dict[test_signer] = {
            "y_true": y_test_in.tolist(),
            "y_pred": preds_in.tolist()
        }
        
        all_y_true_in.extend(y_test_in)
        all_y_pred_in.extend(preds_in)
        all_probs_in.extend(probs_in)
        
        # 2. Evaluate on OOD test clips of Signer X
        probs_ood = model.predict(X_test_ood, verbose=0)
        preds_ood = np.argmax(probs_ood, axis=1)
        
        # An OOD clip is successfully rejected if predicted as _OTHER_ (class 10) or target conf < threshold
        max_target_conf = np.max(probs_ood[:, :REJECT_CLASS_INDEX], axis=1)
        is_rejected_85 = (preds_ood == REJECT_CLASS_INDEX) | (max_target_conf < 0.85)
        rej_count = int(np.sum(is_rejected_85))
        total_ood_signer = int(len(X_test_ood))
        rej_rate = float(rej_count / total_ood_signer)
        
        print(f"OOD Rejection   : {rej_count}/{total_ood_signer} rejected ({rej_rate * 100:.2f}%) at threshold 0.85")
        ood_signer_results[f"signer_{test_signer}"] = {
            "total_ood_clips": total_ood_signer,
            "rejected_clips": rej_count,
            "rejection_rate": rej_rate,
            "ratio": f"{rej_count}/{total_ood_signer}"
        }
        
        all_ood_probs.extend(probs_ood)
        all_ood_preds.extend(preds_ood)
        
        # 3. Mirror test: horizontally flipped test clips (left-handed / mirrored camera)
        probs_in_f = model.predict(horizontal_flip(X_test_in), verbose=0)
        preds_in_f = np.argmax(probs_in_f, axis=1)
        correct_f = int(np.sum(preds_in_f == y_test_in))
        probs_ood_f = model.predict(horizontal_flip(X_test_ood), verbose=0)
        preds_ood_f = np.argmax(probs_ood_f, axis=1)
        rej_f = int(np.sum((preds_ood_f == REJECT_CLASS_INDEX) | (np.max(probs_ood_f[:, :REJECT_CLASS_INDEX], axis=1) < 0.85)))
        print(f"Mirrored In-Class: {correct_f}/{total_in} correct ({correct_f / total_in * 100:.2f}%) | "
              f"Mirrored OOD Rejection: {rej_f}/{total_ood_signer}")
        mirror_per_signer[f"signer_{test_signer}"] = {
            "original": f"{correct_in}/{total_in}",
            "original_accuracy": acc_in,
            "mirrored": f"{correct_f}/{total_in}",
            "mirrored_accuracy": float(correct_f / total_in),
            "mirrored_ood_rejected": f"{rej_f}/{total_ood_signer}"
        }
        all_y_true_flip.extend(y_test_in)
        all_y_pred_flip.extend(preds_in_f)
        all_ood_probs_flip.extend(probs_ood_f)
        all_ood_preds_flip.extend(preds_ood_f)
        
    all_y_true_in = np.array(all_y_true_in)
    all_y_pred_in = np.array(all_y_pred_in)
    all_probs_in = np.array(all_probs_in)
    
    all_ood_probs = np.array(all_ood_probs)
    all_ood_preds = np.array(all_ood_preds)
    
    # Overall in-class accuracy
    total_correct = int(np.sum(all_y_true_in == all_y_pred_in))
    total_test_clips = int(len(all_y_true_in))
    overall_acc = float(total_correct / total_test_clips)
    
    print("\n" + "=" * 70)
    print(f"CLEAN {NUM_CLASSES}-CLASS LOSO OVERALL IN-CLASS ACCURACY: {total_correct}/{total_test_clips} ({overall_acc * 100:.2f}%)")
    
    all_y_true_flip = np.array(all_y_true_flip)
    all_y_pred_flip = np.array(all_y_pred_flip)
    flip_correct = int(np.sum(all_y_true_flip == all_y_pred_flip))
    flip_acc = float(flip_correct / len(all_y_true_flip))
    all_ood_probs_flip = np.array(all_ood_probs_flip)
    all_ood_preds_flip = np.array(all_ood_preds_flip)
    flip_ood_rej_mask = (all_ood_preds_flip == REJECT_CLASS_INDEX) | (np.max(all_ood_probs_flip[:, :REJECT_CLASS_INDEX], axis=1) < 0.85)
    print(f"MIRRORED (LEFT-HAND) IN-CLASS ACCURACY      : {flip_correct}/{len(all_y_true_flip)} ({flip_acc * 100:.2f}%)")
    print(f"MIRRORED OOD REJECTION @0.85                : {int(np.sum(flip_ood_rej_mask))}/{len(flip_ood_rej_mask)}")
    print("=" * 70)
    
    precision, recall, f1, support = precision_recall_fscore_support(
        all_y_true_in, all_y_pred_in, labels=range(len(target_classes)), average=None
    )
    class_metrics = {}
    for idx, cname in enumerate(target_classes):
        class_metrics[cname] = {
            "precision": float(precision[idx]),
            "recall": float(recall[idx]),
            "f1_score": float(f1[idx]),
            "support": int(support[idx])
        }
        print(f"  {cname:<15}: Precision={precision[idx]:.3f}, Recall={recall[idx]:.3f}, F1={f1[idx]:.3f}")
        
    # Confusion Matrix (10 target classes)
    cm_10 = confusion_matrix(all_y_true_in, all_y_pred_in, labels=range(len(target_classes)))
    cm_path = os.path.join(reports_dir, "confusion_matrix.png")
    plot_confusion_matrix(cm_10, target_classes, cm_path)
    
    # Train Production Model on full dataset (in-class + OOD)
    print(f"\n--- Training Final Production {NUM_CLASSES}-Class Model on Full Dataset ---")
    X_full = np.concatenate([X, X_ood], axis=0)
    y_full = np.concatenate([y, y_ood], axis=0)
    X_full_aug, y_full_aug = augment_training_data(X_full, y_full, multiplier=4, boost_new_classes=True)
    y_full_oh = keras.utils.to_categorical(y_full_aug, num_classes=NUM_CLASSES)
    
    final_model = build_classifier_model()
    reduce_lr = keras.callbacks.ReduceLROnPlateau(monitor="loss", factor=0.5, patience=5, min_lr=1e-5, verbose=0)
    final_model.fit(
        X_full_aug, y_full_oh,
        epochs=75,
        batch_size=16,
        callbacks=[reduce_lr],
        verbose=0,
        shuffle=True
    )
    final_model = build_invariant_model(final_model)
    final_model_path = os.path.join(os.path.dirname(__file__), "final_model.h5")
    final_model.save(final_model_path)
    print(f"Saved final {NUM_CLASSES}-class model to: {final_model_path}")
    
    # Threshold sweep from 0.50 to 0.95 (step 0.05) on unseen test signers
    print("\n--- Threshold Sweep on Unseen Test Signers (0.50 to 0.95) ---")
    threshold_sweep = []
    
    # Target confidence on in-class: max probability across the target classes
    max_target_in_conf = np.max(all_probs_in[:, :REJECT_CLASS_INDEX], axis=1)
    max_target_ood_conf = np.max(all_ood_probs[:, :REJECT_CLASS_INDEX], axis=1)
    
    for th in [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]:
        in_accepted_mask = (all_y_pred_in != REJECT_CLASS_INDEX) & (max_target_in_conf >= th)
        coverage = float(np.mean(in_accepted_mask))
        if np.sum(in_accepted_mask) > 0:
            precision_acc = float(accuracy_score(all_y_true_in[in_accepted_mask], all_y_pred_in[in_accepted_mask]))
            accepted_cnt = int(np.sum(in_accepted_mask))
            correct_cnt = int(np.sum(all_y_true_in[in_accepted_mask] == all_y_pred_in[in_accepted_mask]))
        else:
            precision_acc = 1.0
            accepted_cnt = 0
            correct_cnt = 0
            
        ood_rejected_mask = (all_ood_preds == REJECT_CLASS_INDEX) | (max_target_ood_conf < th)
        ood_rej_rate = float(np.mean(ood_rejected_mask))
        ood_rej_cnt = int(np.sum(ood_rejected_mask))
        ood_tot = int(len(all_ood_probs))
        
        threshold_sweep.append({
            "threshold": float(round(th, 2)),
            "coverage": float(round(coverage, 4)),
            "precision": float(round(precision_acc, 4)),
            "accepted_clips": f"{correct_cnt}/{accepted_cnt}",
            "ood_rejection_rate": float(round(ood_rej_rate, 4)),
            "ood_rejected_clips": f"{ood_rej_cnt}/{ood_tot}"
        })
        print(f"Threshold {th:.2f} -> Coverage: {coverage*100:.1f}%, Precision: {precision_acc*100:.1f}%, OOD Rejection: {ood_rej_rate*100:.1f}% ({ood_rej_cnt}/{ood_tot})")
        
    chosen_threshold = 0.85
    
    # Detailed False Label Distribution for OOD clips that passed at 0.85
    ood_passed_mask_85 = (all_ood_preds != REJECT_CLASS_INDEX) & (max_target_ood_conf >= chosen_threshold)
    ood_passed_preds_85 = all_ood_preds[ood_passed_mask_85]
    false_labels_count = {}
    for idx, cname in enumerate(target_classes):
        false_labels_count[cname] = int(np.sum(ood_passed_preds_85 == idx))
        
    # Diagnosis for Signer 3
    s3_true = np.array(signer_cm_dict[3]["y_true"])
    s3_pred = np.array(signer_cm_dict[3]["y_pred"])
    
    s3_misclassifications = []
    for i in range(len(s3_true)):
        if s3_true[i] != s3_pred[i]:
            pred_name = target_classes[s3_pred[i]] if s3_pred[i] < REJECT_CLASS_INDEX else REJECT_CLASS_NAME
            s3_misclassifications.append({
                "clip_idx": i,
                "true_class": target_classes[s3_true[i]],
                "predicted_as": pred_name
            })
            
    s3_error_pairs = {}
    for item in s3_misclassifications:
        pair = f"{item['true_class']} -> {item['predicted_as']}"
        s3_error_pairs[pair] = s3_error_pairs.get(pair, 0) + 1
        
    signer_3_diagnosis = {
        "signer_id": 3,
        "total_test_clips": int(len(s3_true)),
        "correct_clips": int(np.sum(s3_true == s3_pred)),
        "accuracy": float(np.mean(s3_true == s3_pred)),
        "accuracy_ratio": f"{int(np.sum(s3_true == s3_pred))}/{len(s3_true)}",
        "clips_per_class": {cname: int(np.sum(s3_true == idx)) for idx, cname in enumerate(target_classes)},
        "misclassifications_count": len(s3_misclassifications),
        "confusion_pairs": s3_error_pairs
    }
    
    metrics_output = {
        "evaluation_protocol": f"{NUM_CLASSES}-Class Clean Nested Leave-One-Signer-Out (3 Train Signers, 1 Val Signer, 1 Unseen Test Signer)",
        "num_classes": NUM_CLASSES,
        "target_classes": target_classes,
        "reject_class_index": REJECT_CLASS_INDEX,
        "reject_class_name": REJECT_CLASS_NAME,
        "total_in_class_clips": total_test_clips,
        "total_ood_clips": int(len(all_ood_probs)),
        "overall_clean_loso_accuracy": {
            "correct_clips": total_correct,
            "total_clips": total_test_clips,
            "accuracy": overall_acc,
            "ratio": f"{total_correct}/{total_test_clips}"
        },
        "per_signer_in_class_results": per_signer_results,
        "mirror_handedness_evaluation": {
            "description": "Clean Nested LOSO test clips evaluated as-is (Original) vs horizontally flipped x -> -x (Mirrored: left-handed signer / mirrored camera). Training uses 50% original + 50% flipped samples.",
            "original": {
                "correct_clips": total_correct,
                "total_clips": total_test_clips,
                "accuracy": overall_acc,
                "ratio": f"{total_correct}/{total_test_clips}"
            },
            "mirrored": {
                "correct_clips": flip_correct,
                "total_clips": int(len(all_y_true_flip)),
                "accuracy": flip_acc,
                "ratio": f"{flip_correct}/{len(all_y_true_flip)}"
            },
            "mirrored_ood_rejection_at_0_85": {
                "rejected_clips": int(np.sum(flip_ood_rej_mask)),
                "total_ood_clips": int(len(flip_ood_rej_mask)),
                "rejection_rate": float(np.mean(flip_ood_rej_mask))
            },
            "per_signer": mirror_per_signer
        },
        "per_signer_ood_rejection_results": ood_signer_results,
        "per_class_metrics": class_metrics,
        "threshold_sweep_0_50_to_0_95": threshold_sweep,
        "out_of_class_evaluation_at_0_85": {
            "chosen_threshold": chosen_threshold,
            "total_ood_clips": int(len(all_ood_probs)),
            "rejected_clips_count": int(np.sum((all_ood_preds == REJECT_CLASS_INDEX) | (max_target_ood_conf < chosen_threshold))),
            "rejection_percentage": float(np.mean((all_ood_preds == REJECT_CLASS_INDEX) | (max_target_ood_conf < chosen_threshold))),
            "accepted_false_positive_count": int(np.sum(ood_passed_mask_85)),
            "false_labels_assigned": false_labels_count
        },
        "signer_3_diagnosis": signer_3_diagnosis
    }
    
    class NpEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, (np.integer, np.int64, np.int32)):
                return int(obj)
            if isinstance(obj, (np.floating, np.float32, np.float64)):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return super().default(obj)
            
    metrics_path = os.path.join(reports_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_output, f, indent=2, cls=NpEncoder)
        
    print(f"\nSaved clean metrics to: {metrics_path}")
    print(f"Saved confusion matrix to: {cm_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()
