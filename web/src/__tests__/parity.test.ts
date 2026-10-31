import { describe, it, expect, beforeAll } from 'vitest';
import fixture from './parity_fixture.json';
import weights from '../../public/models/weights.json';
import modelMeta from '../../public/models/model_meta.json';
import { processSegmentV2, RawFrameHands } from '../ml/featureExtractor';
import { GestureClassifier } from '../ml/gestureClassifier';
import { getCatalogItemForGesture, getSupportedGesturesList } from '../data/gestureMapping';

describe('SignMedic ML Parity & Verification (FEATURE_SPEC v2.0.0)', () => {
  let classifier: GestureClassifier;

  beforeAll(async () => {
    classifier = new GestureClassifier('/models');
    await classifier.load(modelMeta as any, weights as any);
  });

  it('verifies feature extraction parity against Python fixture within 1e-3', () => {
    const rawHands = fixture.segment_processing_test.raw_segment_hands as unknown as RawFrameHands[];
    const expected = fixture.segment_processing_test.expected_processed_sequence;

    const actual = processSegmentV2(rawHands, 30);

    expect(actual.length).toBe(30);
    expect(actual[0].length).toBe(129);

    let maxDiff = 0;
    for (let t = 0; t < 30; t++) {
      for (let d = 0; d < 129; d++) {
        const diff = Math.abs(actual[t][d] - expected[t][d]);
        if (diff > maxDiff) maxDiff = diff;
      }
    }

    expect(maxDiff).toBeLessThanOrEqual(fixture.tolerance.feature_max_diff);
  });

  it('verifies 11-class TF.js forward pass probability parity within 1e-2', () => {
    const sampleInput = fixture.sequence_inference_test.sample_input_sequence;
    const expectedProbs = fixture.sequence_inference_test.expected_probabilities;

    const actualProbs = classifier.predictRawProbabilities(sampleInput);

    expect(actualProbs.length).toBe(fixture.num_classes);

    let maxProbDiff = 0;
    for (let i = 0; i < actualProbs.length; i++) {
      const diff = Math.abs(actualProbs[i] - expectedProbs[i]);
      if (diff > maxProbDiff) maxProbDiff = diff;
    }

    expect(maxProbDiff).toBeLessThanOrEqual(fixture.tolerance.probability_max_diff);
  });

  it('correctly maps all 10 supported classes to valid catalog items', () => {
    const supported = getSupportedGesturesList();
    expect(supported.length).toBe(10);

    for (const g of supported) {
      const catalogItem = getCatalogItemForGesture(g.className);
      expect(catalogItem).toBeDefined();
      expect(catalogItem?.id).toBe(g.catalogId);
    }
  });

  it('enforces confidence threshold and OOD rejection logic', () => {
    classifier.resetStability();

    // 1. Below threshold test
    const dummyLowConfSeq = Array.from({ length: 30 }, () => new Array(129).fill(0));
    const resultLow = classifier.classifySequence(dummyLowConfSeq);
    expect(resultLow.accepted).toBe(false);
    expect(resultLow.feedbackMessage).toContain('Gestur belum dikenali dengan yakin');

    // 2. High confidence sample sequence from fixture (Air)
    classifier.resetStability();
    const sampleInput = fixture.sequence_inference_test.sample_input_sequence;

    // Segment 1 (unstable yet, N=1)
    const res1 = classifier.classifySequence(sampleInput);
    expect(res1.predictedClassName).toBe('Air');
    expect(res1.confidence).toBeGreaterThanOrEqual(0.85);
    expect(res1.stable).toBe(false);
    expect(res1.accepted).toBe(false);

    // Segment 2 (now stable, N=2)
    const res2 = classifier.classifySequence(sampleInput);
    expect(res2.predictedClassName).toBe('Air');
    expect(res2.confidence).toBeGreaterThanOrEqual(0.85);
    expect(res2.stable).toBe(true);
    expect(res2.accepted).toBe(true);
  });

  it('applies temporal probability smoothing (EMA 0.65/0.35) and resets properly', () => {
    classifier.resetStability();

    const sampleInput = fixture.sequence_inference_test.sample_input_sequence;
    const rawProbs = classifier.predictRawProbabilities(sampleInput);

    // Initial evaluation: smoothed equals raw
    const r1 = classifier.classifySequence(sampleInput);
    for (let i = 0; i < rawProbs.length; i++) {
      expect(r1.probabilities[i]).toBeCloseTo(rawProbs[i], 4);
    }

    // Second evaluation with dummy (zeros input)
    const dummySeq = Array.from({ length: 30 }, () => new Array(129).fill(0));
    const rawDummyProbs = classifier.predictRawProbabilities(dummySeq);
    const r2 = classifier.classifySequence(dummySeq);

    for (let i = 0; i < rawDummyProbs.length; i++) {
      const expectedSmoothed = 0.65 * rawDummyProbs[i] + 0.35 * rawProbs[i];
      expect(r2.probabilities[i]).toBeCloseTo(expectedSmoothed, 4);
    }

    // Reset stability and smoothing
    classifier.resetStability();
    const r3 = classifier.classifySequence(sampleInput);
    for (let i = 0; i < rawProbs.length; i++) {
      expect(r3.probabilities[i]).toBeCloseTo(rawProbs[i], 4);
    }
  });
});
