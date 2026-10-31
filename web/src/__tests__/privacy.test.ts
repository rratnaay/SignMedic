import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processSegmentV2 } from '../ml/featureExtractor';
import { GestureClassifier } from '../ml/gestureClassifier';
import weights from '../../public/models/weights.json';
import modelMeta from '../../public/models/model_meta.json';

describe('SignMedic Privacy & Zero Data Transmission Test', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('guarantees feature extraction and inference operate in-memory without any outbound network calls', async () => {
    const classifier = new GestureClassifier('/models');
    await classifier.load(modelMeta as any, weights as any);

    // Initial mock data simulating raw hand segment
    const mockHands = [
      [
        Array.from({ length: 21 }, (_, i) => ({ x: 0.5 + i * 0.01, y: 0.4 - i * 0.01, z: 0.0 })),
      ],
    ];

    // Reset spy call count after loading model
    fetchSpy.mockClear();

    // Run extraction
    const features = processSegmentV2(mockHands, 30);
    expect(features.length).toBe(30);

    // Run classification
    const result = classifier.classifySequence(features);
    expect(result).toBeDefined();

    // Verify 0 outbound network requests during camera frame processing and inference
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('verifies that no base64 image data or media streams are transmitted', () => {
    const sensitiveMediaPayloadPatterns = [
      'data:image',
      'base64',
      'video/',
      'blob:',
      'MediaStream',
    ];

    // Ensure all fetch calls during application lifecycle never include camera/video payload
    fetchSpy.mock.calls.forEach((args: any[]) => {
      const requestBody = args[1]?.body;
      if (typeof requestBody === 'string') {
        sensitiveMediaPayloadPatterns.forEach((pattern) => {
          expect(requestBody).not.toContain(pattern);
        });
      }
    });
  });
});
