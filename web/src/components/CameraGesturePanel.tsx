import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, Check, X, CircleDashed, ShieldAlert, ArrowRight, HelpCircle, SwitchCamera, ChevronDown, ChevronUp } from 'lucide-react';
import { PulseLine } from './PulseLine';
import { GestureClassifier, PredictionResult } from '../ml/gestureClassifier';
import { processSegmentV2, RawFrameHands } from '../ml/featureExtractor';
import { getCatalogItemForGesture, getSupportedGesturesList } from '../data/gestureMapping';
import { useTriage } from '../state/triageContext';

interface CameraGesturePanelProps {
  onSwitchToBoard: () => void;
}

type CameraStatus =
  | 'idle' // Camera not requested yet ("Kamera belum aktif.")
  | 'requesting' // Prompting user
  | 'active' // Video stream running
  | 'denied' // Permission denied or error
  | 'unsupported'; // MediaDevices not supported

type ModelStatus =
  | 'loading' // Loading ML weights & HandLandmarker
  | 'ready' // Ready to run inference
  | 'error'; // Failed to load

// Hand connection pairs for skeleton overlay
const HAND_CONNECTIONS = [
  // Palm
  [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
];

// Sliding window & cadence configuration for rapid real-time inference (Sweet Spot)
const MAX_BUFFER = 45; // ~1.5s at 30fps: captures natural BISINDO gesture duration
const MIN_ACTIVE_FRAMES = 30; // ~1.0s: minimum movement required before first evaluation (stroke peak)
const CADENCE_FRAMES = 12; // ~400ms: rolling evaluation interval
const COOLDOWN_MS = 1200; // 1.2s cooldown after accepting a candidate to prevent duplicate spam

export const CameraGesturePanel: React.FC<CameraGesturePanelProps> = ({ onSwitchToBoard }) => {
  const { dispatch } = useTriage();

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isVocabOpen, setIsVocabOpen] = useState<boolean>(true);

  // Recognition state
  const [candidate, setCandidate] = useState<PredictionResult | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [handsDetectedInCurrentFrame, setHandsDetectedInCurrentFrame] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const classifierRef = useRef<GestureClassifier | null>(null);

  // Fast rolling buffer & cadence refs
  const bufferRef = useRef<RawFrameHands[]>([]);
  const absentCounterRef = useRef<number>(0);
  const isInferringRef = useRef<boolean>(false);
  const frameStepRef = useRef<number>(0);
  const lastAcceptedTimeRef = useRef<number>(0);
  const wasCoolingDownRef = useRef<boolean>(false);
  const candidateRef = useRef<PredictionResult | null>(null);

  useEffect(() => {
    candidateRef.current = candidate;
  }, [candidate]);

  // 1. Initialize classifier and HandLandmarker
  useEffect(() => {
    let isMounted = true;

    async function initML() {
      try {
        const classifier = new GestureClassifier('/models');
        await classifier.load();
        classifierRef.current = classifier;

        let vision;
        try {
          const testRes = await fetch('/wasm/vision_wasm_internal.js', { method: 'HEAD' });
          const contentType = testRes.headers.get('content-type') || '';
          if (testRes.ok && !contentType.includes('text/html')) {
            vision = await FilesetResolver.forVisionTasks('/wasm');
          } else {
            throw new Error('Local wasm not available');
          }
        } catch {
          // Fallback to official pinned CDN resolver if local wasm is not available
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm'
          );
        }

        let landmarker: HandLandmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          });
        } catch {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          });
        }

        handLandmarkerRef.current = landmarker;

        if (isMounted) {
          setModelStatus('ready');
        }
      } catch (err) {
        console.error('Failed to initialize gesture models:', err);
        if (isMounted) {
          setModelStatus('error');
        }
      }
    }

    initML();

    return () => {
      isMounted = false;
      classifierRef.current?.dispose();
      handLandmarkerRef.current?.close();
    };
  }, []);

  const safePlayVideo = (video: HTMLVideoElement | null) => {
    if (!video) return;
    try {
      const p = video.play();
      if (p !== undefined && typeof p?.catch === 'function') {
        p.catch((err) => {
          console.warn('Video play interrupted:', err);
        });
      }
    } catch (err) {
      console.warn('Video play call error:', err);
    }
  };

  // 2. Camera activation (strictly user-triggered) with back/front camera toggle
  const startCamera = async (overrideFacingMode?: 'user' | 'environment') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unsupported');
      return;
    }

    const targetFacing = overrideFacingMode || facingMode;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setCameraStatus('requesting');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 400 },
          facingMode: targetFacing,
        },
        audio: false,
      });

      setStream(mediaStream);
      setCameraStatus('active');

      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.srcObject = mediaStream;
        safePlayVideo(videoRef.current);
      }
    } catch (err) {
      if (targetFacing === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 400 },
              facingMode: 'user',
            },
            audio: false,
          });
          setFacingMode('user');
          setStream(fallbackStream);
          setCameraStatus('active');
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.srcObject = fallbackStream;
            safePlayVideo(videoRef.current);
          }
          return;
        } catch {
          // Both failed
        }
      }
      console.warn('Camera access denied or unavailable:', err);
      setCameraStatus('denied');
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraStatus === 'active') {
      await startCamera(nextMode);
    }
  };

  // Connect stream to video element whenever stream changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.muted = true;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const onPlay = () => safePlayVideo(video);

    video.addEventListener('loadedmetadata', onPlay);
    video.addEventListener('canplay', onPlay);
    safePlayVideo(video);

    return () => {
      video.removeEventListener('loadedmetadata', onPlay);
      video.removeEventListener('canplay', onPlay);
    };
  }, [stream, cameraStatus]);

  // Callback ref to guarantee stream attachment whenever video mounts
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && stream) {
      node.muted = true;
      if (node.srcObject !== stream) {
        node.srcObject = stream;
      }
      safePlayVideo(node);
    }
  }, [stream]);

  // Stop camera stream when unmounted
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [stream]);

  // 3. Inference trigger for a captured hand segment
  const runSegmentInference = useCallback(async (segment: RawFrameHands[]) => {
    if (!classifierRef.current || isInferringRef.current || candidateRef.current) return;
    if (segment.length < 5) return; // Ignore very brief accidental flashes

    isInferringRef.current = true;
    try {
      const features = processSegmentV2(segment, 30);
      const result = classifierRef.current.classifySequence(features);

      if (result.accepted) {
        setCandidate(result);
        candidateRef.current = result;
        setFeedbackNotice(null);
        // Cooldown & streak reset:
        lastAcceptedTimeRef.current = performance.now();
        classifierRef.current.resetStability();
        bufferRef.current = [];
      } else {
        if (result.feedbackMessage) {
          setFeedbackNotice(result.feedbackMessage);
        }
      }
    } catch (err) {
      console.error('Error in segment inference:', err);
    } finally {
      isInferringRef.current = false;
    }
  }, []);

  // 4. Render and tracking animation loop
  useEffect(() => {
    if (cameraStatus !== 'active' || modelStatus !== 'ready') return;

    let lastVideoTime = -1;
    let lastTimestampMs = -1;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = handLandmarkerRef.current;

      if (video && canvas && landmarker && video.readyState >= 2) {
        if (video.paused && !video.ended) {
          safePlayVideo(video);
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Adjust canvas internal dimensions to match video
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 400;
          }

          const width = canvas.width;
          const height = canvas.height;

          // Clear previous drawings
          ctx.clearRect(0, 0, width, height);

          // Detect hand landmarks
          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const nowMs = performance.now();
            const startTimeMs = nowMs > lastTimestampMs ? nowMs : lastTimestampMs + 1;
            lastTimestampMs = startTimeMs;

            try {
              const detections = landmarker.detectForVideo(video, startTimeMs);

              const hasHands = detections.landmarks && detections.landmarks.length > 0;
              setHandsDetectedInCurrentFrame(hasHands);

              if (hasHands) {
                // Reset absent frames counter
                absentCounterRef.current = 0;

                // Extract raw normalized landmarks
                const frameHands: RawFrameHands = detections.landmarks.map((hand) =>
                  hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
                );

                // Accumulate in sliding buffer (up to MAX_BUFFER frames)
                bufferRef.current.push(frameHands);
                if (bufferRef.current.length > MAX_BUFFER) {
                  bufferRef.current.shift(); // FIFO rolling window
                }

                frameStepRef.current += 1;
                const now = performance.now();
                const isCoolingDown = now - lastAcceptedTimeRef.current < COOLDOWN_MS;

                // Reset buffer and EMA probability smoothing when cooldown ends
                if (wasCoolingDownRef.current && !isCoolingDown) {
                  bufferRef.current = [];
                  classifierRef.current?.resetStability();
                }
                wasCoolingDownRef.current = isCoolingDown;

                // Sliding cadence inference: evaluate every CADENCE_FRAMES once buffer has minimal frames
                if (
                  !isCoolingDown &&
                  !candidateRef.current &&
                  bufferRef.current.length >= MIN_ACTIVE_FRAMES &&
                  frameStepRef.current % CADENCE_FRAMES === 0
                ) {
                  const segment = [...bufferRef.current];
                  runSegmentInference(segment);
                }

                // Draw skeleton overlay
                // Mirror coordinates horizontally: (1 - x) * width
                for (const hand of detections.landmarks) {
                  // Draw connecting lines (cyan-blue #3D9FD5)
                  ctx.strokeStyle = '#3D9FD5';
                  ctx.lineWidth = 2.5;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';

                  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
                    const pStart = hand[startIdx];
                    const pEnd = hand[endIdx];
                    if (pStart && pEnd) {
                      ctx.beginPath();
                      ctx.moveTo((1 - pStart.x) * width, pStart.y * height);
                      ctx.lineTo((1 - pEnd.x) * width, pEnd.y * height);
                      ctx.stroke();
                    }
                  }

                  // Draw joints as white dots (#FFFFFF)
                  ctx.fillStyle = '#FFFFFF';
                  for (const point of hand) {
                    ctx.beginPath();
                    ctx.arc((1 - point.x) * width, point.y * height, 3.5, 0, 2 * Math.PI);
                    ctx.fill();
                  }
                }
              } else {
                // No hand detected in this frame
                if (bufferRef.current.length > 0) {
                  absentCounterRef.current += 1;
                  // When hands are absent for >= 5 consecutive frames, check if final segment should be evaluated
                  if (absentCounterRef.current >= 5) {
                    const now = performance.now();
                    const isCoolingDown = now - lastAcceptedTimeRef.current < COOLDOWN_MS;
                    if (!isCoolingDown && !candidateRef.current && bufferRef.current.length >= MIN_ACTIVE_FRAMES) {
                      const segment = [...bufferRef.current];
                      runSegmentInference(segment);
                    }
                    bufferRef.current = [];
                    absentCounterRef.current = 0;
                    classifierRef.current?.resetStability();
                  }
                } else {
                  // Hands remain absent (idle): ensure stability and smoothing stay clean
                  classifierRef.current?.resetStability();
                }
              }
            } catch (detErr) {
              console.warn('MediaPipe frame detection error:', detErr);
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraStatus, modelStatus, runSegmentInference]);

  // Handle Candidate Actions
  const handleConfirmCandidate = () => {
    if (!candidate) return;
    const item = getCatalogItemForGesture(candidate.predictedClassName);
    if (item) {
      dispatch({ type: 'SELECT_ITEM', payload: item.id });
    }
    setCandidate(null);
    candidateRef.current = null;
    setFeedbackNotice(null);
    lastAcceptedTimeRef.current = performance.now();
    bufferRef.current = [];
    classifierRef.current?.resetStability();
  };

  const handleCancelCandidate = () => {
    setCandidate(null);
    candidateRef.current = null;
    setFeedbackNotice(null);
    lastAcceptedTimeRef.current = performance.now();
    bufferRef.current = [];
    classifierRef.current?.resetStability();
  };

  const supportedList = getSupportedGesturesList();

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Camera Panel Frame (16:10 aspect ratio, dark background #142C58) */}
      <section
        aria-label="Area Pengenalan Gestur Kamera"
        className="relative aspect-[16/10] w-full overflow-hidden rounded-panel border border-edge bg-[#142C58] shadow-sm flex flex-col items-center justify-center text-white"
      >
        {/* Persistent Mirrored Webcam Stream */}
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover scale-x-[-1] transition-opacity duration-200 ${
            cameraStatus === 'active' ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'
          }`}
        />

        {/* Persistent Skeleton Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full pointer-events-none transition-opacity duration-200 ${
            cameraStatus === 'active' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none -z-10'
          }`}
        />

        {/* Bottom status bar */}
        {cameraStatus === 'active' && (
          <div className="absolute bottom-0 inset-x-0 z-20 bg-[#0A1428]/85 backdrop-blur-sm px-4 py-2 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  handsDetectedInCurrentFrame ? 'bg-[#5BBF73] animate-pulse' : 'bg-white/40'
                }`}
                aria-hidden="true"
              />
              <span className="font-medium">
                {handsDetectedInCurrentFrame
                  ? 'Tangan terdeteksi — Peragakan gestur BISINDO'
                  : 'Arahkan tangan ke depan kamera'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFacingMode}
                className="inline-flex items-center gap-1.5 rounded-badge bg-white/20 hover:bg-white/30 px-2.5 py-1 text-[11px] text-white font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-white"
                title="Ganti kamera depan / belakang"
              >
                <SwitchCamera className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{facingMode === 'user' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
              </button>
              <span className="text-[11px] text-white/70 hidden sm:inline">
                Privasi: frame video tidak disimpan
              </span>
            </div>
          </div>
        )}

        {/* State A: Model loading */}
        {modelStatus === 'loading' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center z-20">
            <div className="w-16 text-[#3D9FD5]">
              <PulseLine />
            </div>
            <p className="text-sm font-semibold text-white/90">
              Menyiapkan pengenalan gestur...
            </p>
          </div>
        )}

        {/* State B: Model failed */}
        {modelStatus === 'error' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm z-20">
            <ShieldAlert className="h-8 w-8 text-[#FFB4AB]" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">
              Pengenalan gestur tidak tersedia. Gunakan Papan Visual.
            </p>
            <button
              type="button"
              onClick={onSwitchToBoard}
              className="mt-2 inline-flex min-h-[42px] items-center gap-1.5 rounded-control bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-soft transition-colors"
            >
              <span>Buka Papan Visual</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* State C: Model ready, Camera idle (not requested yet) */}
        {modelStatus === 'ready' && cameraStatus === 'idle' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm z-20">
            <Camera className="h-10 w-10 text-[#8CC6EE]" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Kamera belum aktif.</p>
            <p className="text-xs text-white/70">
              Kamera hanya membaca gerakan tangan langsung di browser dan tidak disimpan atau dikirim ke internet.
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-control bg-[#22753A] px-5 py-2 text-xs font-bold text-white hover:bg-[#2a8b46] transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#5BBF73]"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              <span>Aktifkan kamera</span>
            </button>
          </div>
        )}

        {/* State C2: Requesting camera permission */}
        {cameraStatus === 'requesting' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm z-20">
            <div className="w-16 text-[#3D9FD5]">
              <PulseLine />
            </div>
            <p className="text-sm font-semibold text-white/90">
              Menghubungkan ke kamera...
            </p>
          </div>
        )}

        {/* State D: Camera permission denied or device error */}
        {cameraStatus === 'denied' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm z-20">
            <ShieldAlert className="h-8 w-8 text-[#FFB4AB]" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">
              Kamera tidak bisa dipakai. Papan Visual tetap bisa digunakan.
            </p>
            <button
              type="button"
              onClick={onSwitchToBoard}
              className="mt-2 inline-flex min-h-[42px] items-center gap-1.5 rounded-control bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-soft transition-colors"
            >
              <span>Buka Papan Visual</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* State D2: Unsupported device */}
        {cameraStatus === 'unsupported' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm z-20">
            <ShieldAlert className="h-8 w-8 text-[#FFB4AB]" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">
              Perangkat kamera tidak didukung di browser ini. Papan Visual tetap bisa digunakan.
            </p>
            <button
              type="button"
              onClick={onSwitchToBoard}
              className="mt-2 inline-flex min-h-[42px] items-center gap-1.5 rounded-control bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-soft transition-colors"
            >
              <span>Buka Papan Visual</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {/* 2. Feedback notice for below-threshold predictions (DESIGN.md Section 9) */}
      {feedbackNotice && !candidate && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-card border border-line bg-soft p-3 text-xs text-muted"
        >
          <HelpCircle className="h-4 w-4 text-blue shrink-0" aria-hidden="true" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* 3. Candidate Prediction Box (DESIGN.md Section 7 & 9) */}
      {candidate && (
        <section
          aria-labelledby="candidate-prediction-title"
          className="flex flex-col gap-3 rounded-card border-2 border-[#2A6A99] bg-surface p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            {/* Status Badge: Kandidat Prediksi AI (dashed circle + dashed border) */}
            <span className="inline-flex items-center gap-1.5 rounded-badge border border-dashed border-[#2A6A99] bg-surface px-2.5 py-1 text-xs font-bold text-[#2A6A99]">
              <CircleDashed className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>Kandidat Prediksi AI</span>
            </span>

            <span className="text-[11px] text-muted">
              Perlu persetujuan Anda
            </span>
          </div>

          <div className="flex flex-col gap-1 py-1">
            <h4
              id="candidate-prediction-title"
              className="text-[26px] font-extrabold text-ink leading-tight"
            >
              {candidate.predictedClassName}
            </h4>
            {getCatalogItemForGesture(candidate.predictedClassName) && (
              <p className="text-xs text-muted">
                Dipetakan ke:{' '}
                <strong className="text-ink font-semibold">
                  {getCatalogItemForGesture(candidate.predictedClassName)?.label}
                </strong>
              </p>
            )}
          </div>

          {/* Action buttons: Konfirmasi (Aksen) | Batal / Ubah Manual (Sekunder) */}
          {/* Note: NO CONFIDENCE PERCENTAGE is shown per DESIGN.md R-17 */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleConfirmCandidate}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-control bg-[#22753A] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1b5e2f] transition-all focus:outline-none focus:ring-2 focus:ring-[#5BBF73]"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>Konfirmasi</span>
            </button>

            <button
              type="button"
              onClick={handleCancelCandidate}
              className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-control border border-edge bg-tint px-4 py-2 text-xs font-bold text-ink hover:bg-soft transition-all"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span>Batal / Ubah Manual</span>
            </button>
          </div>
        </section>
      )}

      {/* 4. Supported Gestures Vocabulary List (DESIGN.md Section 7) */}
      <section
        aria-labelledby="supported-vocab-title"
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
          <div className="flex-1 min-w-[200px]">
            <h4 id="supported-vocab-title" className="text-sm font-extrabold text-ink">
              Kosakata Gestur yang Didukung ({supportedList.length})
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Tunjukkan salah satu gestur berikut di depan kamera. Gestur yang dikenali akan meminta konfirmasi Anda terlebih dahulu.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsVocabOpen((prev) => !prev)}
            aria-expanded={isVocabOpen}
            aria-controls="supported-vocab-grid"
            aria-label={isVocabOpen ? 'Sembunyikan kosakata gestur' : 'Lihat kosakata gestur'}
            className="flex items-center gap-1 rounded-control border border-line bg-soft px-2.5 py-1 text-xs font-extrabold text-ink hover:bg-tint transition-colors shrink-0"
          >
            <span>{isVocabOpen ? 'Sembunyikan' : 'Lihat'}</span>
            {isVocabOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            )}
          </button>
        </div>

        {isVocabOpen && (
          <div
            id="supported-vocab-grid"
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1"
          >
            {supportedList.map((g) => (
              <div
                key={g.className}
                className="flex flex-col gap-0.5 rounded-control border border-line bg-tint/60 p-2.5 text-left"
              >
                <span className="text-xs font-bold text-ink">{g.className}</span>
                <span className="text-[11px] text-muted truncate">{g.displayLabel}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
