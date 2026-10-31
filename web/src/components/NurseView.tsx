import React, { useState, useRef } from 'react';
import { SymptomSummary } from './SymptomSummary';
import { useTriage } from '../state/triageContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { HelpCircle, MessageSquarePlus, Trash2, Mic, Send, AlertCircle } from 'lucide-react';

const QUICK_QUESTIONS = [
  'Apa keluhan utama yang Anda rasakan?',
  'Bagian tubuh mana yang terasa sakit?',
  'Sejak kapan keluhan ini dirasakan?',
  'Apakah Anda memiliki riwayat alergi obat?',
  'Silakan tunggu sebentar, kami akan memeriksa Anda.',
];

export const NurseView: React.FC = () => {
  const { dispatch } = useTriage();
  const [inputText, setInputText] = useState('');
  const baseTextRef = useRef<string>('');

  const {
    isSupported,
    isListening,
    errorMessage,
    toggleListening,
    resetError,
  } = useSpeechRecognition({
    lang: 'id-ID',
    onResult: (transcript) => {
      const base = baseTextRef.current;
      setInputText(base ? `${base} ${transcript}` : transcript);
    },
  });

  const handleMicClick = () => {
    resetError();
    if (!isListening) {
      baseTextRef.current = inputText.trim();
    }
    toggleListening();
  };

  const handleSendQuestion = (question: string) => {
    dispatch({
      type: 'ADD_NURSE_MESSAGE',
      payload: { text: question, sender: 'nurse' },
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    dispatch({
      type: 'ADD_NURSE_MESSAGE',
      payload: { text: inputText.trim(), sender: 'nurse' },
    });
    setInputText('');
    baseTextRef.current = '';
    resetError();
  };

  const handleResetSession = () => {
    const confirmReset = window.confirm(
      'Apakah Anda yakin ingin mengakhiri sesi? Seluruh data keluhan dan riwayat percakapan akan dihapus dari memori.'
    );
    if (confirmReset) {
      dispatch({ type: 'RESET_SESSION' });
    }
  };

  return (
    <article
      aria-labelledby="nurse-panel-title"
      className="flex flex-col rounded-panel border border-line bg-surface shadow-sm overflow-hidden"
    >
      {/* Panel Header */}
      <header className="border-b border-line bg-soft/70 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="nurse-panel-title" className="text-xl font-extrabold text-ink sm:text-2xl">
              Ringkasan dari pasien
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Pilihan visual pasien disinkronkan secara langsung di panel ini.
            </p>
          </div>

          <span className="rounded-badge bg-blue/15 px-2.5 py-1 text-xs font-bold text-blue">
            Layar Petugas
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Confirmed Symptom Summary */}
        <SymptomSummary isPatientView={false} />

        {/* Quick Questions Card */}
        <section
          aria-label="Pertanyaan Cepat Triase"
          className="flex flex-col gap-2.5 rounded-card border border-line bg-soft p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-line/60 pb-2">
            <HelpCircle className="h-4 w-4 text-blue" aria-hidden="true" />
            <h3 className="text-sm font-extrabold text-ink">Pertanyaan Cepat Triase</h3>
          </div>

          <div className="flex flex-col gap-1.5">
            {QUICK_QUESTIONS.map((question, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendQuestion(question)}
                className="group flex min-h-[42px] w-full items-center justify-between rounded-control border border-line bg-surface px-3 py-2 text-left transition-all hover:border-brand hover:bg-tint/40 active:scale-[0.99] focus-visible:outline focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tint text-[11px] font-bold text-brand">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-ink group-hover:text-brand">
                    {question}
                  </span>
                </div>
                <Send className="h-3.5 w-3.5 text-muted group-hover:text-brand transition-colors" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        {/* Free Text & Speech Input Card */}
        <section
          aria-label="Ketik atau ucapkan pesan ke pasien"
          className="flex flex-col gap-2.5 rounded-card border border-line bg-soft p-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4 text-blue" aria-hidden="true" />
              <h3 className="text-sm font-extrabold text-ink">Ketik atau Ucapkan Pesan</h3>
            </div>
            {isListening && (
              <div
                className="flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-0.5 text-[11px] font-bold text-brand animate-pulse"
                aria-live="polite"
              >
                <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                <span>Mendengarkan</span>
              </div>
            )}
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (errorMessage) resetError();
                }}
                placeholder="Tulis pesan atau instruksi untuk pasien..."
                className="min-h-[44px] flex-1 rounded-control border border-edge/80 bg-surface px-3 py-1.5 text-xs font-semibold text-ink placeholder:text-muted/70 focus-visible:outline focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2"
              />
              <button
                type="button"
                onClick={handleMicClick}
                disabled={!isSupported}
                title={
                  !isSupported
                    ? 'Speech-to-Text tidak tersedia di browser ini'
                    : isListening
                    ? 'Klik untuk berhenti mendengarkan'
                    : 'Ucapkan pesan (Speech-to-Text id-ID)'
                }
                aria-label={
                  !isSupported
                    ? 'Speech-to-Text tidak didukung'
                    : isListening
                    ? 'Sedang mendengarkan... Klik untuk berhenti'
                    : 'Ucapkan pesan menggunakan mikrofon'
                }
                aria-pressed={isListening}
                className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-control border transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2 ${
                  !isSupported
                    ? 'border-line bg-surface text-muted/40 cursor-not-allowed opacity-50'
                    : isListening
                    ? 'border-brand bg-tint text-brand ring-2 ring-brand ring-offset-2'
                    : 'border-edge/80 bg-surface text-brand hover:bg-tint/50 active:scale-[0.98]'
                }`}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-control px-4 py-2 text-xs font-extrabold transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2 ${
                  !inputText.trim()
                    ? 'cursor-not-allowed bg-brand/40 text-brand-ink/70'
                    : 'bg-brand text-brand-ink hover:opacity-90 shadow-sm active:scale-[0.98]'
                }`}
              >
                <span>Kirim Pesan</span>
              </button>
            </div>

            {/* Unsupported Note */}
            {!isSupported && (
              <p className="text-xs text-muted" role="status">
                Speech-to-Text tidak tersedia di browser ini. Gunakan pertanyaan cepat atau ketik manual.
              </p>
            )}

            {/* Error or Denied Status */}
            {errorMessage && (
              <div
                className="flex items-center gap-2 rounded-control border border-err/30 bg-err-bg px-3 py-2 text-xs font-semibold text-err"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-err" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </section>

        {/* End Session Button */}
        <div className="pt-2 border-t border-line/60">
          <button
            type="button"
            onClick={handleResetSession}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-control border border-err/50 bg-err-bg/30 px-4 py-2 text-xs font-extrabold text-err transition-all hover:bg-err hover:text-white active:scale-[0.99] focus-visible:outline focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Akhiri Sesi dan Hapus Data</span>
          </button>
        </div>
      </div>
    </article>
  );
};
