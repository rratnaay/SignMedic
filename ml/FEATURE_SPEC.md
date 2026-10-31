# SignMedic Feature Specification (Version 2.0.0)

This document serves as the **single source of truth** for feature extraction, normalization, and sequence processing across both the Python training pipeline (`ml/`) and the client-side TypeScript inference engine (`web/`).

---

## 1. Landmark Extraction & Representation

* **Tracker:** MediaPipe Hands / HandLandmarker.
* **Hands per frame:** Maximum 2 hands ($H = 2$).
* **Landmarks per hand:** 21 landmarks ($L = 21$), each with 3D camera-space coordinates $(x, y, z) \in [0.0, 1.0]$.
* **Raw frame format:** $(H \times L \times 3) = (2 \times 21 \times 3) = 126$ raw coordinate values.

---

## 2. Sequence-Level Active Hand Assignment & Idle Table-Hand Suppression (v2.0.0)

### A. Temporal Hand Slot Tracking Across the Active Segment
For a continuous segment of $M$ frames where hand(s) are detected:
1. At frame $t = 0$, detected hands are ordered by wrist $x$-coordinate ($x_0 < x_1$).
2. For frame $t > 0$, detected hands are matched to the hand slots of frame $t-1$ by minimizing the Euclidean distance between their wrists ($\mathbf{p}^{\text{raw}}_{h, 0}$). This maintains consistent temporal trajectories for slot 0 and slot 1.
3. If only 1 hand is observed at frame $t$, it is matched to the nearest active slot; the other slot is marked unobserved at that frame.

### B. Activity Score & Active-Hand First Assignment
To ensure the primary signing hand is ALWAYS placed in **`hand_0`** (indices $0 \dots 62$) regardless of whether a stationary hand is resting on the left side of the table:

For each slot $h \in \{0, 1\}$, calculate its **Motion Path Length** ($\text{path\_len}_h$) and **Average Screen Height** ($\text{height}_h$) over observed frames $M_{\text{obs}, h}$:

$$\text{path\_len}_h = \frac{1}{\max(1, M_{\text{obs}, h}-1)} \sum_{t=1, \text{both obs}}^{M-1} \left( \|\mathbf{p}^{\text{raw}}_{h, 0}(t) - \mathbf{p}^{\text{raw}}_{h, 0}(t-1)\|_2 + \|\mathbf{p}^{\text{raw}}_{h, 8}(t) - \mathbf{p}^{\text{raw}}_{h, 8}(t-1)\|_2 \right)$$

$$\text{height}_h = \frac{1}{\max(1, M_{\text{obs}, h})} \sum_{t=0, \text{obs}}^{M-1} (1.0 - y^{\text{raw}}_{h, 0}(t))$$

$$\text{activity\_score}_h = \text{path\_len}_h + \text{height}_h$$

*(Note: $\mathbf{p}_{h, 8}$ is the index fingertip, capturing finger movements even when the wrist moves minimally; $1.0 - y$ gives higher scores to hands raised near the chest/chin/mouth).*

* **Slot Re-Assignment Rule:**
  $$\text{If } \text{activity\_score}_1 > \text{activity\_score}_0, \quad \text{swap slot 0 and slot 1 across all frames in the segment.}$$
  Now, slot 0 is strictly guaranteed to be the primary active hand (**`hand_0`**).

### C. Idle Table-Hand Suppression Rule
In clinical or triage settings, a patient frequently rests their passive hand on the table or lap while gesturing with the active hand. If the second hand is purely stationary, it must be suppressed to avoid confusing single-handed gestures:

$$\text{If } \text{path\_len}_1 < 0.25 \times \text{path\_len}_0 \quad \text{AND} \quad (\bar{y}^{\text{raw}}_{1, 0} - \bar{y}^{\text{raw}}_{0, 0}) > 0.12:$$

$$\text{Suppress Hand 1: Set Hand 1 landmarks (indices } 63 \dots 125 \text{) and inter-wrist vector (indices } 126 \dots 128 \text{) to } 0.0.$$

---

## 3. Per-Hand Spatial Normalization

For each active hand $h \in \{0, 1\}$ at each frame:
1. **Wrist Centering (Translation Invariance):**
   $$\mathbf{p}'_{h, i} = \mathbf{p}^{\text{raw}}_{h, i} - \mathbf{p}^{\text{raw}}_{h, 0}, \quad \forall i \in \{0, 1, \dots, 20\}$$
   *(Landmark 0 becomes $(0, 0, 0)$).*

2. **Scale Normalization (Scale & Distance Invariance):**
   Compute the Euclidean scale distance between Landmark 0 (wrist) and Landmark 9 (middle MCP):
   $$s_h = \|\mathbf{p}^{\text{raw}}_{h, 9} - \mathbf{p}^{\text{raw}}_{h, 0}\|_2 = \sqrt{(x_{h,9} - x_{h,0})^2 + (y_{h,9} - y_{h,0})^2 + (z_{h,9} - z_{h,0})^2}$$
   Divide centered coordinates by $s_h + \epsilon$:
   $$\hat{\mathbf{p}}_{h, i} = \frac{\mathbf{p}'_{h, i}}{s_h + \epsilon}, \quad \text{where } \epsilon = 10^{-6}$$

---

## 4. Inter-Hand Interaction Features

* If **both Hand 0 and Hand 1 are active** (and Hand 1 was not suppressed by Rule 2C):
  $$s_{\text{avg}} = \frac{s_0 + s_1}{2}$$
  $$\mathbf{v}_{\text{inter}} = \frac{\mathbf{p}^{\text{raw}}_{1, 0} - \mathbf{p}^{\text{raw}}_{0, 0}}{s_{\text{avg}} + \epsilon} \in \mathbb{R}^3$$
* If **only Hand 0 is active or Hand 1 was suppressed**:
  $$\mathbf{v}_{\text{inter}} = [0.0, 0.0, 0.0]^\top$$

---

## 5. Total Frame Feature Vector Dimension

Concatenating normalized coordinates of Hand 0, Hand 1, and the inter-hand vector:
$$\mathbf{f}_{\text{frame}} = \Big[ \hat{\mathbf{p}}_{0, 0 \dots 20}, \; \hat{\mathbf{p}}_{1, 0 \dots 20}, \; \mathbf{v}_{\text{inter}} \Big]$$

$$\text{Dimension} = (2 \times 21 \times 3) + 3 = 126 + 3 = 129$$

---

## 6. Sequence Temporal Processing

* The segment where hand(s) are detected is uniformly resampled across time to $T = 30$ frames:
  $$\mathbf{X} \in \mathbb{R}^{B \times 30 \times 129}$$
  Linear interpolation is used across timestamps.

---

## 7. Model Output Contract & OOD Rejection (v2.0.0)

* **Architecture Output:** 7 softmax neurons:
  * Index 0: `Air`
  * Index 1: `Makan`
  * Index 2: `Saya`
  * Index 3: `Tuli`
  * Index 4: `Maaf`
  * Index 5: `Terima kasih`
  * Index 6: `_OTHER_` (Background / Out-of-Class rejection category)
* **Candidate Acceptance Logic:**
  A prediction is accepted as a triage candidate if and only if:
  $$\hat{y} \neq \text{"\_OTHER\_"} \quad \text{AND} \quad \max_{k \in \{0 \dots 5\}} P(y=k) \ge \text{threshold}$$
  If $\hat{y} == \text{"\_OTHER\_"}$ or confidence $< \text{threshold}$, the system displays:
  *"Gestur belum dikenali dengan yakin. Silakan gunakan Papan Komunikasi Visual."*

---

## 8. Exported Metadata Contract (`model_meta.json`)

```json
{
  "classes": ["Air", "Makan", "Saya", "Tuli", "Maaf", "Terima kasih"],
  "num_classes": 7,
  "reject_class_index": 6,
  "reject_class_name": "_OTHER_",
  "T": 30,
  "feature_dim": 129,
  "normalization_version": "2.0.0",
  "threshold": 0.85,
  "stability_n": 2,
  "source": "WL-BISINDO Banten (Phase 1 Benchmark Model v2.0.0)"
}
```
