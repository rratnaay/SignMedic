# ASSUMPTIONS & DESIGN DECISIONS (SignMedic)

This document records all architectural choices, assumptions, and design simplifications made during the implementation of the SignMedic prototype.

---

## 1. General Principles
* **Non-Medical Device Disclaimer:** SignMedic is an initial communication bridge for Deaf BISINDO patients and healthcare workers at triage reception. It is strictly **NOT** a diagnostic or medical decision device.
* **Scope Control:** Only features explicitly required by the specification are implemented. No speculative features or diagnostic logic will be added.

## 2. Machine Learning Pipeline (`ml/`)
* **Hand Ordering & Mirroring:** 
  * MediaPipe's handedness labels are prone to flipping depending on selfie/mirror video transformation.
  * *Assumption/Decision:* Detected hands are ordered strictly by the screen x-coordinate of landmark 0 (wrist) in ascending order ($x_0 < x_1$). Hand 0 is the leftmost hand on screen, Hand 1 is the rightmost.
* **Feature Vector Length:**
  * Hand 0: 21 landmarks $\times$ 3 coordinates $(x, y, z) = 63$.
  * Hand 1: 21 landmarks $\times$ 3 coordinates $(x, y, z) = 63$.
  * Inter-hand vector: $(\Delta x, \Delta y, \Delta z)$ scaled by average hand scale $= 3$.
  * Total frame dimension $= 63 + 63 + 3 = 129$.
  * Undetected hands are represented by zeros.
* **Sequence Length $T$:**
  * Fixed at $T = 30$ frames (~1 second at 30 FPS).
  * Video segments with detected hands are uniformly resampled to length 30 via linear interpolation.
* **Validation Strategy:**
  * Model evaluation uses **Leave-One-Signer-Out (LOSO)** cross-validation to prevent identity leakage, ensuring generalization across different signers.
* **Out-of-Class Evaluation:**
  * Target benchmark classes: 6 glosses (`Air`, `Makan`, `Saya`, `Tuli`, `Maaf`, `Terima kasih`).
  * The remaining 26 glosses from WL-BISINDO are utilized as out-of-class samples to measure out-of-distribution (OOD) rejection rates at threshold $\ge 0.90$.

## 3. Web & Client Runtime (`web/`)
* **100% Client-Side Inference:**
  * Landmark tracking via `@mediapipe/tasks-vision` (HandLandmarker WebAssembly).
  * Sequence classification via `@tensorflow/tfjs` in the browser.
  * No Python runtime exists during app execution. No video frames are ever transmitted over the network.
* **Zero Persistence:**
  * State is maintained purely in React memory via `useReducer`.
  * `localStorage`, `sessionStorage`, `IndexedDB`, and cookies are strictly forbidden.
  * The "Akhiri Sesi" (End Session) action resets state to an empty initial state.
* **Dual-View Synchronization:**
  * Both patient and healthcare worker views can be rendered side-by-side in one window or synchronized across two browser tabs using the standard browser `BroadcastChannel` API.
* **Human-in-the-Loop:**
  * Predictions from the gesture model are displayed as "Kandidat Prediksi AI".
  * They NEVER enter the confirmed symptom summary without explicit patient tap/click on "Konfirmasi".
* **Fallback Priority:**
  * The Universal Visual Communication Board functions entirely offline without camera, microphone, or network. It is the primary and fail-safe channel.

## 4. Backend & Gemini Serverless Function (`api/refine.ts`)
* **Minimal Scope:** Exactly one serverless endpoint on Vercel.
* **Strict Input Whitelist:** Only confirmed catalog IDs (`string[]`) are accepted. Any free-text, landmark data, or invalid IDs are rejected.
* **Deterministic Fallback:** If Gemini times out (4 seconds), fails, or the network is offline, the client seamlessly renders a deterministic template from the confirmed catalog labels without breaking the triage workflow.
