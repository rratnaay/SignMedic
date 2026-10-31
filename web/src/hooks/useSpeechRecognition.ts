import { useState, useEffect, useRef, useCallback } from 'react';

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error';

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  status: SpeechRecognitionStatus;
  isListening: boolean;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetError: () => void;
}

export function useSpeechRecognition({
  lang = 'id-ID',
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  // Check browser support on initial mount
  useEffect(() => {
    isMountedRef.current = true;
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('unsupported');
    }

    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore abort error on unmount
        }
      }
    };
  }, []);

  const resetError = useCallback(() => {
    setErrorMessage(null);
    if (status === 'denied' || status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop error
      }
    }
    if (isMountedRef.current) {
      setStatus('idle');
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('unsupported');
      return;
    }

    // Reset previous errors
    setErrorMessage(null);

    // Abort existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        setStatus('listening');
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        if (!isMountedRef.current) return;
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const combined = (finalTranscript || interimTranscript).trim();
        if (combined && onResult) {
          onResult(combined, Boolean(finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        if (!isMountedRef.current) return;
        const errType = event.error;

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setStatus('denied');
          const msg = 'Mikrofon tidak bisa dipakai. Ketik pesan atau pilih pertanyaan cepat.';
          setErrorMessage(msg);
          onError?.(msg);
        } else if (errType === 'no-speech') {
          // Silent or no speech detected; return smoothly to idle
          setStatus('idle');
        } else {
          setStatus('error');
          const msg = 'Mikrofon tidak bisa dipakai. Ketik pesan atau pilih pertanyaan cepat.';
          setErrorMessage(msg);
          onError?.(msg);
        }
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;
        setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      if (isMountedRef.current) {
        setStatus('error');
        const msg = 'Mikrofon tidak bisa dipakai. Ketik pesan atau pilih pertanyaan cepat.';
        setErrorMessage(msg);
        onError?.(msg);
      }
    }
  }, [lang, onResult, onError]);

  const toggleListening = useCallback(() => {
    if (status === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [status, startListening, stopListening]);

  return {
    isSupported,
    status,
    isListening: status === 'listening',
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    resetError,
  };
}
