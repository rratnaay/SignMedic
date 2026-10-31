/**
 * FEATURE_SPEC v2.0.0 implementation in TypeScript.
 * Single source of truth: ml/FEATURE_SPEC.md
 *
 * Implements:
 * 1. 3D Euclidean distance calculation.
 * 2. Cross-frame hand slot tracking (slot 0 and slot 1).
 * 3. Activity score calculation (path length + screen height).
 * 4. Active-hand first slot re-assignment.
 * 5. Idle table-hand suppression rule.
 * 6. Per-hand spatial normalization (wrist centering & scale normalization).
 * 7. Inter-hand interaction features.
 * 8. Uniform temporal resampling to T=30 frames with linear interpolation.
 */

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export type HandLandmarks = Landmark3D[];
export type RawFrameHands = HandLandmarks[];

export const TARGET_T = 30;
export const FEATURE_DIM = 129;
export const EPSILON = 1e-6;

export function dist3D(a: Landmark3D, b: Landmark3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Process a segment of detected hand frames according to FEATURE_SPEC v2.0.0.
 *
 * @param rawSegmentHands Array of detected hands per frame in the segment.
 * @param targetT Target sequence length (default 30).
 * @returns 2D array of shape [targetT, 129] containing normalized features.
 */
export function processSegmentV2(
  rawSegmentHands: RawFrameHands[],
  targetT: number = TARGET_T
): number[][] {
  const M = rawSegmentHands.length;

  if (M === 0) {
    return Array.from({ length: targetT }, () => new Array(FEATURE_DIM).fill(0));
  }

  // 1. Temporal hand slot tracking across consecutive frames
  const trackedSlots: [HandLandmarks | null, HandLandmarks | null][] = [];
  let prevWrist0: Landmark3D | null = null;
  let prevWrist1: Landmark3D | null = null;

  for (let t = 0; t < M; t++) {
    const detected = rawSegmentHands[t];
    if (!detected || detected.length === 0) {
      trackedSlots.push([null, null]);
      continue;
    }

    if (detected.length === 1) {
      const h = detected[0];
      if (prevWrist0 === null && prevWrist1 === null) {
        trackedSlots.push([h, null]);
        prevWrist0 = h[0];
      } else if (prevWrist1 === null) {
        trackedSlots.push([h, null]);
        prevWrist0 = h[0];
      } else if (prevWrist0 === null) {
        trackedSlots.push([null, h]);
        prevWrist1 = h[0];
      } else {
        const d0 = dist3D(h[0], prevWrist0);
        const d1 = dist3D(h[0], prevWrist1);
        if (d0 <= d1) {
          trackedSlots.push([h, null]);
          prevWrist0 = h[0];
        } else {
          trackedSlots.push([null, h]);
          prevWrist1 = h[0];
        }
      }
    } else {
      // 2 or more hands detected: sort leftmost first by wrist x
      const sortedHands = [...detected.slice(0, 2)].sort((a, b) => a[0].x - b[0].x);
      const hLeft = sortedHands[0];
      const hRight = sortedHands[1];

      if (prevWrist0 === null || prevWrist1 === null) {
        trackedSlots.push([hLeft, hRight]);
        prevWrist0 = hLeft[0];
        prevWrist1 = hRight[0];
      } else {
        const dSample = dist3D(hLeft[0], prevWrist0) + dist3D(hRight[0], prevWrist1);
        const dSwap = dist3D(hRight[0], prevWrist0) + dist3D(hLeft[0], prevWrist1);
        if (dSample <= dSwap) {
          trackedSlots.push([hLeft, hRight]);
          prevWrist0 = hLeft[0];
          prevWrist1 = hRight[0];
        } else {
          trackedSlots.push([hRight, hLeft]);
          prevWrist0 = hRight[0];
          prevWrist1 = hLeft[0];
        }
      }
    }
  }

  // 2. Activity score calculation for slot 0 and slot 1
  function computeSlotMetrics(slotIdx: 0 | 1) {
    const wristPts: Landmark3D[] = [];
    const indexPts: Landmark3D[] = [];
    for (let t = 0; t < M; t++) {
      const hand = trackedSlots[t][slotIdx];
      if (hand && hand.length > 8) {
        wristPts.push(hand[0]);
        indexPts.push(hand[8]);
      }
    }

    if (wristPts.length === 0) {
      return { pathLen: 0, avgY: 0, actScore: 0 };
    }

    let pathSum = 0;
    for (let i = 1; i < wristPts.length; i++) {
      pathSum += dist3D(wristPts[i], wristPts[i - 1]) + dist3D(indexPts[i], indexPts[i - 1]);
    }
    const pathLen = pathSum / Math.max(1, wristPts.length - 1);
    const avgY = wristPts.reduce((acc, w) => acc + w.y, 0) / wristPts.length;
    const heightScore = 1.0 - avgY;
    const actScore = pathLen + heightScore;
    return { pathLen, avgY, actScore };
  }

  let m0 = computeSlotMetrics(0);
  let m1 = computeSlotMetrics(1);

  // 3. Active-hand first re-assignment
  let reassignedSlots = trackedSlots;
  if (m1.actScore > m0.actScore) {
    reassignedSlots = trackedSlots.map((pair) => [pair[1], pair[0]]);
    const temp = m0;
    m0 = m1;
    m1 = temp;
  }

  // 4. Idle table-hand suppression rule
  const suppressSlot1 =
    m1.pathLen < 0.25 * m0.pathLen && m1.avgY - m0.avgY > 0.12 && m0.pathLen > 0.01;

  // 5. Normalization into 129 dimensions
  const frameFeatures = Array.from({ length: M }, () => new Float32Array(FEATURE_DIM));

  for (let t = 0; t < M; t++) {
    let [h0, h1] = reassignedSlots[t];
    if (suppressSlot1) {
      h1 = null;
    }

    let s0: number | null = null;
    let s1: number | null = null;
    let w0Pt: [number, number, number] | null = null;
    let w1Pt: [number, number, number] | null = null;

    if (h0 && h0.length === 21) {
      const w = h0[0];
      const mcp9 = h0[9];
      s0 = dist3D(mcp9, w);
      w0Pt = [w.x, w.y, w.z];
      for (let i = 0; i < 21; i++) {
        frameFeatures[t][i * 3 + 0] = (h0[i].x - w.x) / (s0 + EPSILON);
        frameFeatures[t][i * 3 + 1] = (h0[i].y - w.y) / (s0 + EPSILON);
        frameFeatures[t][i * 3 + 2] = (h0[i].z - w.z) / (s0 + EPSILON);
      }
    }

    if (h1 && h1.length === 21) {
      const w = h1[0];
      const mcp9 = h1[9];
      s1 = dist3D(mcp9, w);
      w1Pt = [w.x, w.y, w.z];
      const off = 63;
      for (let i = 0; i < 21; i++) {
        frameFeatures[t][off + i * 3 + 0] = (h1[i].x - w.x) / (s1 + EPSILON);
        frameFeatures[t][off + i * 3 + 1] = (h1[i].y - w.y) / (s1 + EPSILON);
        frameFeatures[t][off + i * 3 + 2] = (h1[i].z - w.z) / (s1 + EPSILON);
      }
    }

    if (h0 && h1 && s0 !== null && s1 !== null && w0Pt && w1Pt) {
      const sAvg = (s0 + s1) / 2.0;
      frameFeatures[t][126] = (w1Pt[0] - w0Pt[0]) / (sAvg + EPSILON);
      frameFeatures[t][127] = (w1Pt[1] - w0Pt[1]) / (sAvg + EPSILON);
      frameFeatures[t][128] = (w1Pt[2] - w0Pt[2]) / (sAvg + EPSILON);
    }
  }

  // 6. Uniform temporal resampling to T=30
  if (M === 1) {
    return Array.from({ length: targetT }, () => Array.from(frameFeatures[0]));
  }

  const resampled: number[][] = Array.from({ length: targetT }, (_, s) => {
    const tau = ((M - 1) * s) / (targetT - 1);
    const idx0 = Math.floor(tau);
    const idx1 = Math.min(idx0 + 1, M - 1);
    const alpha = tau - idx0;
    const row = new Array<number>(FEATURE_DIM);
    for (let d = 0; d < FEATURE_DIM; d++) {
      row[d] = (1.0 - alpha) * frameFeatures[idx0][d] + alpha * frameFeatures[idx1][d];
    }
    return row;
  });

  return resampled;
}
