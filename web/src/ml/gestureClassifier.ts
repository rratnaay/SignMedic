/**
 * SignMedic Client-Side Gesture Classifier (TF.js Browser Engine)
 * Single source of truth: ml/FEATURE_SPEC.md v2.0.0 & web/public/models/
 *
 * Implements:
 * 1. Weight loading from /models/weights.json.
 * 2. Forward pass with TensorFlow.js:
 *    Conv1D (same, relu) -> BatchNorm (eps=1e-3) -> Conv1D (dilated=2, same, relu) -> BatchNorm (eps=1e-3) ->
 *    cuDNN GRU (reset_after: true) -> Dense (relu) -> Dense (softmax, 11 classes).
 * 3. Temporal Probability Smoothing (EMA 0.65/0.35) within active gesture session.
 * 4. Candidate evaluation with threshold check (threshold >= 0.85) and _OTHER_ rejection.
 * 5. Temporal stability check (N=2 consecutive segments).
 */

import * as tf from '@tensorflow/tfjs';

export interface ModelMetadata {
  classes: string[];
  num_classes: number;
  reject_class_index: number;
  reject_class_name: string;
  T: number;
  feature_dim: number;
  normalization_version: string;
  threshold: number;
  stability_n: number;
  source: string;
}

export interface WeightRecord {
  shape: number[];
  values: number[];
}

export type WeightsManifest = Record<string, WeightRecord>;

export interface PredictionResult {
  accepted: boolean;
  predictedClassIndex: number;
  predictedClassName: string;
  confidence: number;
  probabilities: number[];
  stable: boolean;
  feedbackMessage?: string;
}

export class GestureClassifier {
  private metadata: ModelMetadata | null = null;
  private weights: WeightsManifest | null = null;
  private isLoaded: boolean = false;

  // Cached TF tensors for execution
  private c1_kernel: tf.Tensor | null = null;
  private c1_bias: tf.Tensor | null = null;
  private bn1_gamma: tf.Tensor | null = null;
  private bn1_beta: tf.Tensor | null = null;
  private bn1_mean: tf.Tensor | null = null;
  private bn1_var: tf.Tensor | null = null;

  private c2_kernel: tf.Tensor | null = null;
  private c2_bias: tf.Tensor | null = null;
  private bn2_gamma: tf.Tensor | null = null;
  private bn2_beta: tf.Tensor | null = null;
  private bn2_mean: tf.Tensor | null = null;
  private bn2_var: tf.Tensor | null = null;

  private W_z: tf.Tensor | null = null;
  private W_r: tf.Tensor | null = null;
  private W_h: tf.Tensor | null = null;
  private U_z: tf.Tensor | null = null;
  private U_r: tf.Tensor | null = null;
  private U_h: tf.Tensor | null = null;
  private b_iz: tf.Tensor | null = null;
  private b_ir: tf.Tensor | null = null;
  private b_ih: tf.Tensor | null = null;
  private b_rz: tf.Tensor | null = null;
  private b_rr: tf.Tensor | null = null;
  private b_rh: tf.Tensor | null = null;

  private d1_kernel: tf.Tensor | null = null;
  private d1_bias: tf.Tensor | null = null;
  private pred_kernel: tf.Tensor | null = null;
  private pred_bias: tf.Tensor | null = null;

  // Stability tracker: history of raw predictions
  private consecutiveClassHistory: number[] = [];

  // Temporal Probability Smoothing (EMA)
  private prevSmoothedProbs: number[] = [];

  constructor(
    private modelBasePath: string = '/models'
  ) {}

  /**
   * Initializes the classifier by fetching model metadata and weights.
   * Can also accept preloaded objects for offline/unit-testing environments.
   */
  async load(preloadedMeta?: ModelMetadata, preloadedWeights?: WeightsManifest): Promise<void> {
    if (this.isLoaded) return;

    if (preloadedMeta && preloadedWeights) {
      this.metadata = preloadedMeta;
      this.weights = preloadedWeights;
    } else {
      const getFullUrl = (path: string) => {
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const origin =
          typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
            ? window.location.origin
            : 'http://localhost';
        return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
      };

      const metaUrl = getFullUrl(`${this.modelBasePath}/model_meta.json`);
      const weightsUrl = getFullUrl(`${this.modelBasePath}/weights.json`);

      const [metaRes, weightsRes] = await Promise.all([
        fetch(metaUrl),
        fetch(weightsUrl),
      ]);

      if (!metaRes.ok || !weightsRes.ok) {
        throw new Error('Gagal memuat model gestur atau bobot.');
      }

      this.metadata = (await metaRes.json()) as ModelMetadata;
      this.weights = (await weightsRes.json()) as WeightsManifest;
    }

    this.initializeTensors();
    this.isLoaded = true;
  }

  private initializeTensors(): void {
    if (!this.weights) return;

    const w = this.weights;

    this.c1_kernel = tf.tensor(w['conv1d_10/kernel'].values, w['conv1d_10/kernel'].shape);
    this.c1_bias = tf.tensor(w['conv1d_10/bias'].values, w['conv1d_10/bias'].shape);

    this.bn1_gamma = tf.tensor(w['batch_normalization_10/gamma'].values, w['batch_normalization_10/gamma'].shape);
    this.bn1_beta = tf.tensor(w['batch_normalization_10/beta'].values, w['batch_normalization_10/beta'].shape);
    this.bn1_mean = tf.tensor(w['batch_normalization_10/moving_mean'].values, w['batch_normalization_10/moving_mean'].shape);
    this.bn1_var = tf.tensor(w['batch_normalization_10/moving_variance'].values, w['batch_normalization_10/moving_variance'].shape);

    this.c2_kernel = tf.tensor(w['conv1d_11/kernel'].values, w['conv1d_11/kernel'].shape);
    this.c2_bias = tf.tensor(w['conv1d_11/bias'].values, w['conv1d_11/bias'].shape);

    this.bn2_gamma = tf.tensor(w['batch_normalization_11/gamma'].values, w['batch_normalization_11/gamma'].shape);
    this.bn2_beta = tf.tensor(w['batch_normalization_11/beta'].values, w['batch_normalization_11/beta'].shape);
    this.bn2_mean = tf.tensor(w['batch_normalization_11/moving_mean'].values, w['batch_normalization_11/moving_mean'].shape);
    this.bn2_var = tf.tensor(w['batch_normalization_11/moving_variance'].values, w['batch_normalization_11/moving_variance'].shape);

    const gru_kernel = tf.tensor(w['gru_5/gru_cell/kernel'].values, w['gru_5/gru_cell/kernel'].shape);
    const gru_recurrent_kernel = tf.tensor(w['gru_5/gru_cell/recurrent_kernel'].values, w['gru_5/gru_cell/recurrent_kernel'].shape);
    const gru_bias = tf.tensor(w['gru_5/gru_cell/bias'].values, w['gru_5/gru_cell/bias'].shape);

    const gru_bias_input = tf.slice(gru_bias, [0, 0], [1, 192]).reshape([192]);
    const gru_bias_recurrent = tf.slice(gru_bias, [1, 0], [1, 192]).reshape([192]);

    this.W_z = tf.slice(gru_kernel, [0, 0], [64, 64]);
    this.W_r = tf.slice(gru_kernel, [0, 64], [64, 64]);
    this.W_h = tf.slice(gru_kernel, [0, 128], [64, 64]);

    this.U_z = tf.slice(gru_recurrent_kernel, [0, 0], [64, 64]);
    this.U_r = tf.slice(gru_recurrent_kernel, [0, 64], [64, 64]);
    this.U_h = tf.slice(gru_recurrent_kernel, [0, 128], [64, 64]);

    this.b_iz = tf.slice(gru_bias_input, [0], [64]);
    this.b_ir = tf.slice(gru_bias_input, [64], [64]);
    this.b_ih = tf.slice(gru_bias_input, [128], [64]);

    this.b_rz = tf.slice(gru_bias_recurrent, [0], [64]);
    this.b_rr = tf.slice(gru_bias_recurrent, [64], [64]);
    this.b_rh = tf.slice(gru_bias_recurrent, [128], [64]);

    this.d1_kernel = tf.tensor(w['dense_5/kernel'].values, w['dense_5/kernel'].shape);
    this.d1_bias = tf.tensor(w['dense_5/bias'].values, w['dense_5/bias'].shape);

    this.pred_kernel = tf.tensor(w['prediction/kernel'].values, w['prediction/kernel'].shape);
    this.pred_bias = tf.tensor(w['prediction/bias'].values, w['prediction/bias'].shape);

    gru_kernel.dispose();
    gru_recurrent_kernel.dispose();
    gru_bias.dispose();
    gru_bias_input.dispose();
    gru_bias_recurrent.dispose();
  }

  /**
   * Runs forward pass for a resampled sequence [30, 129] and returns raw 11-class probabilities.
   */
  predictRawProbabilities(sequence30x129: number[][]): number[] {
    if (!this.isLoaded) {
      throw new Error('Model belum selesai dimuat.');
    }

    return tf.tidy(() => {
      const x = tf.tensor(sequence30x129).reshape([1, 30, 129]);

      // 1. Conv1D 10
      const c1Raw = tf.conv1d(x as tf.Tensor3D, this.c1_kernel! as tf.Tensor3D, 1, 'same', 'NWC', 1);
      const c1 = tf.relu(tf.add(c1Raw, this.c1_bias!)) as tf.Tensor3D;
      const bn1 = tf.batchNorm(
        c1,
        this.bn1_mean! as tf.Tensor1D,
        this.bn1_var! as tf.Tensor1D,
        this.bn1_beta! as tf.Tensor1D,
        this.bn1_gamma! as tf.Tensor1D,
        0.001
      ) as tf.Tensor3D;

      // 2. Conv1D 11 (dilation_rate = 2)
      const c2Raw = tf.conv1d(bn1, this.c2_kernel! as tf.Tensor3D, 1, 'same', 'NWC', 2);
      const c2 = tf.relu(tf.add(c2Raw, this.c2_bias!)) as tf.Tensor3D;
      const bn2 = tf.batchNorm(
        c2,
        this.bn2_mean! as tf.Tensor1D,
        this.bn2_var! as tf.Tensor1D,
        this.bn2_beta! as tf.Tensor1D,
        this.bn2_gamma! as tf.Tensor1D,
        0.001
      ) as tf.Tensor3D;

      // 3. cuDNN GRU forward pass across 30 time steps
      const unstacked = tf.unstack(bn2.squeeze([0]), 0);
      let h = tf.zeros([1, 64]);

      for (let t = 0; t < 30; t++) {
        const xt = unstacked[t].reshape([1, 64]);

        const xz = tf.add(tf.matMul(xt, this.W_z!), this.b_iz!);
        const hz = tf.add(tf.matMul(h, this.U_z!), this.b_rz!);
        const z = tf.sigmoid(tf.add(xz, hz));

        const xr = tf.add(tf.matMul(xt, this.W_r!), this.b_ir!);
        const hr = tf.add(tf.matMul(h, this.U_r!), this.b_rr!);
        const r = tf.sigmoid(tf.add(xr, hr));

        const xh = tf.add(tf.matMul(xt, this.W_h!), this.b_ih!);
        const recurrent_cand = tf.mul(r, tf.add(tf.matMul(h, this.U_h!), this.b_rh!));
        const cand = tf.tanh(tf.add(xh, recurrent_cand));

        h = tf.add(tf.mul(z, h), tf.mul(tf.sub(1.0, z), cand));
      }

      // 4. Dense 64
      const d1 = tf.relu(tf.add(tf.matMul(h, this.d1_kernel!), this.d1_bias!));

      // 5. Prediction 11 (Softmax)
      const logits = tf.add(tf.matMul(d1, this.pred_kernel!), this.pred_bias!);
      const probs = tf.softmax(logits);
      return Array.from(probs.dataSync());
    });
  }

  /**
   * Classifies a resampled sequence according to FEATURE_SPEC v2.0.0 acceptance and stability rules.
   * Includes Temporal Probability Smoothing (EMA: 0.65 current + 0.35 prev) to eliminate UI flickering.
   */
  classifySequence(sequence30x129: number[][], applySmoothing: boolean = true): PredictionResult {
    const rawProbs = this.predictRawProbabilities(sequence30x129);
    const meta = this.getMetadata();

    // Temporal Probability Smoothing (EMA) within active motion session
    let probs = rawProbs;
    if (applySmoothing && this.prevSmoothedProbs.length === rawProbs.length) {
      probs = rawProbs.map((p, i) => 0.65 * p + 0.35 * this.prevSmoothedProbs[i]);
    }
    this.prevSmoothedProbs = [...probs];

    // Find class with highest probability
    let maxIdx = 0;
    let maxProb = probs[0];
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        maxIdx = i;
      }
    }

    const allClasses = [...meta.classes, meta.reject_class_name];
    const predictedClassName = allClasses[maxIdx] ?? 'Unknown';

    // Update consecutive history
    this.consecutiveClassHistory.push(maxIdx);
    if (this.consecutiveClassHistory.length > meta.stability_n) {
      this.consecutiveClassHistory.shift();
    }

    const isStable =
      this.consecutiveClassHistory.length === meta.stability_n &&
      this.consecutiveClassHistory.every((c) => c === maxIdx);

    const isOOD = maxIdx === meta.reject_class_index;
    const isAboveThreshold = maxProb >= meta.threshold;

    if (!isAboveThreshold || isOOD) {
      return {
        accepted: false,
        predictedClassIndex: maxIdx,
        predictedClassName,
        confidence: maxProb,
        probabilities: probs,
        stable: isStable,
        feedbackMessage: 'Gestur belum dikenali dengan yakin. Silakan gunakan Papan Komunikasi Visual.',
      };
    }

    if (!isStable) {
      return {
        accepted: false,
        predictedClassIndex: maxIdx,
        predictedClassName,
        confidence: maxProb,
        probabilities: probs,
        stable: false,
        feedbackMessage: 'Menstabilkan gestur...',
      };
    }

    return {
      accepted: true,
      predictedClassIndex: maxIdx,
      predictedClassName,
      confidence: maxProb,
      probabilities: probs,
      stable: true,
    };
  }

  resetStability(): void {
    this.consecutiveClassHistory = [];
    this.prevSmoothedProbs = [];
  }

  resetSmoothing(): void {
    this.prevSmoothedProbs = [];
  }

  getMetadata(): ModelMetadata {
    if (!this.metadata) {
      return {
        classes: [
          'Air',
          'Makan',
          'Saya',
          'Tuli',
          'Maaf',
          'Terima kasih',
          'Batuk',
          'Demam',
          'Pilek',
          'Sesak Nafas',
        ],
        num_classes: 11,
        reject_class_index: 10,
        reject_class_name: '_OTHER_',
        T: 30,
        feature_dim: 129,
        normalization_version: '2.0.0',
        threshold: 0.85,
        stability_n: 2,
        source: 'WL-BISINDO Banten (Phase 1 Benchmark Model v2.0.0)',
      };
    }
    return this.metadata;
  }

  dispose(): void {
    this.c1_kernel?.dispose();
    this.c1_bias?.dispose();
    this.bn1_gamma?.dispose();
    this.bn1_beta?.dispose();
    this.bn1_mean?.dispose();
    this.bn1_var?.dispose();

    this.c2_kernel?.dispose();
    this.c2_bias?.dispose();
    this.bn2_gamma?.dispose();
    this.bn2_beta?.dispose();
    this.bn2_mean?.dispose();
    this.bn2_var?.dispose();

    this.W_z?.dispose();
    this.W_r?.dispose();
    this.W_h?.dispose();
    this.U_z?.dispose();
    this.U_r?.dispose();
    this.U_h?.dispose();
    this.b_iz?.dispose();
    this.b_ir?.dispose();
    this.b_ih?.dispose();
    this.b_rz?.dispose();
    this.b_rr?.dispose();
    this.b_rh?.dispose();

    this.d1_kernel?.dispose();
    this.d1_bias?.dispose();
    this.pred_kernel?.dispose();
    this.pred_bias?.dispose();

    this.isLoaded = false;
  }
}
