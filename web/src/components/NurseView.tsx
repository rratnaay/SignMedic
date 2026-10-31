import React, { useState } from 'react';
import { SymptomSummary } from './SymptomSummary';
import { useTriage } from '../state/triageContext';
import { Stethoscope, HelpCircle, MessageSquarePlus, Trash2, Mic, ArrowRight } from 'lucide-react';

const QUICK_QUESTIONS = [
  { label: 'Keluhan Utama', question: 'Apa keluhan utama yang Anda rasakan?' },
  { label: 'Lokasi Sakit', question: 'Bagian tubuh mana yang terasa sakit?' },
  { label: 'Durasi', question: 'Sejak kapan keluhan ini dirasakan?' },
  { label: 'Alergi Obat', question: 'Apakah Anda memiliki riwayat alergi obat?' },
  { label: 'Instruksi', question: 'Silakan tunggu sebentar, kami akan memeriksa Anda.' },
];

export const NurseView: React.FC = () => {
  const { dispatch } = useTriage();
  const [inputText, setInputText] = useState('');

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
      payload: { text: inputText, sender: 'nurse' },
    });
    setInputText('');
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
      className="flex flex-col rounded-panel border border-line bg-surface shadow-panel overflow-hidden"
    >
      {/* Panel Header */}
      <header className="border-b border-line bg-soft px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 items-center rounded-badge bg-blue px-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
              Layar Petugas Triase
            </span>
            <span className="text-xs font-semibold text-muted">
              Monitoring & Interaksi Klinis
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Stethoscope className="h-4 w-4 text-brand" />
            Tenaga Kesehatan
          </span>
        </div>

        <h2 id="nurse-panel-title" className="mt-2 text-xl font-extrabold text-ink sm:text-2xl">
          Ringkasan dari pasien
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Data hasil pilihan visual pasien disinkronkan secara langsung di panel ini.
        </p>
      </header>

      {/* Main Content */}
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {/* Confirmed Symptom Summary */}
        <SymptomSummary isPatientView={false} />

        {/* Quick Questions Card: Structured Clinical Action Buttons */}
        <section
          aria-label="Pertanyaan Cepat Triase"
          className="flex flex-col gap-3.5 rounded-card border border-line bg-soft p-5 shadow-card"
        >
          <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue" aria-hidden="true" />
              <h3 className="text-base font-extrabold text-ink">Pertanyaan Cepat Triase</h3>
            </div>
            <span className="text-xs font-semibold text-muted">Kirim 1-Klik</span>
          </div>

          <p className="text-xs text-muted">
            Pilih pertanyaan klinis standar di bawah untuk langsung ditampilkan di layar pasien dengan teks besar:
          </p>

          <div className="flex flex-col gap-2">
            {QUICK_QUESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendQuestion(item.question)}
                className="group flex min-h-[48px] w-full items-center justify-between rounded-control border border-line bg-surface px-4 py-2.5 text-left transition-all hover:border-brand hover:bg-tint/50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-badge bg-tint text-xs font-extrabold text-brand">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-bold text-ink group-hover:text-brand">
                    {item.question}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-muted group-hover:text-brand transition-colors">
                  <span className="hidden sm:inline">Kirim</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Free Text Input Card: Two-Way Clinical Intercom */}
        <section
          aria-label="Ketik Pesan ke Pasien"
          className="flex flex-col gap-3.5 rounded-card border border-line bg-soft p-5 shadow-card"
        >
          <div className="flex items-center gap-2 border-b border-line/60 pb-2.5">
            <MessageSquarePlus className="h-5 w-5 text-blue" aria-hidden="true" />
            <h3 className="text-base font-extrabold text-ink">Ketik Pesan Tambahan</h3>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tulis pesan atau instruksi untuk pasien..."
              className="min-h-[48px] flex-1 rounded-control border border-edge/80 bg-surface px-4 py-2 text-sm font-semibold text-ink placeholder:text-muted/70 focus-visible:outline shadow-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled
                title="Fitur Speech-to-Text hadir di Fase 4"
                className="flex h-[48px] w-[48px] items-center justify-center rounded-control border border-line bg-surface text-muted opacity-50 cursor-not-allowed"
                aria-label="Input suara (hadir di Fase 4)"
              >
                <Mic className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-control px-5 py-2 text-sm font-extrabold transition-all ${
                  !inputText.trim()
                    ? 'cursor-not-allowed bg-brand/40 text-brand-ink/70'
                    : 'bg-brand text-brand-ink hover:opacity-90 shadow-sm active:scale-[0.98]'
                }`}
              >
                <span>Kirim Pesan</span>
              </button>
            </div>
          </form>

          <p className="text-[11px] font-medium text-muted">
            Fitur Speech-to-Text aktif di Fase 4. Saat ini gunakan kolom ketik di atas atau tombol pertanyaan cepat 1-klik.
          </p>
        </section>

        {/* End Session Button */}
        <div className="pt-2 border-t border-line/60">
          <button
            type="button"
            onClick={handleResetSession}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-control border border-err/60 bg-err-bg/40 px-4 py-2.5 text-sm font-extrabold text-err transition-all hover:bg-err hover:text-white active:scale-[0.99]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Akhiri Sesi dan Hapus Data</span>
          </button>
          <span className="mt-1.5 block text-center text-[11px] text-muted">
            Menghapus seluruh pilihan keluhan dan percakapan dari memori RAM seketika.
          </span>
        </div>
      </div>
    </article>
  );
};
