import React, { useState } from 'react';
import { VisualBoard } from './VisualBoard';
import { SymptomSummary } from './SymptomSummary';
import { useTriage } from '../state/triageContext';
import { LayoutGrid, Camera, MessageSquareText, UserCheck } from 'lucide-react';

export const PatientView: React.FC = () => {
  const { state } = useTriage();
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'camera'>('board');

  return (
    <article
      aria-labelledby="patient-panel-title"
      className="flex flex-col rounded-panel border border-line bg-surface shadow-panel overflow-hidden"
    >
      {/* Panel Header: Authoritative & Calm Clinical Heading */}
      <header className="border-b border-line bg-soft px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 items-center rounded-badge bg-brand px-2.5 text-[11px] font-extrabold uppercase tracking-wider text-brand-ink">
              Layar Pasien
            </span>
            <span className="text-xs font-semibold text-muted">
              Input Gejala & Komunikasi
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-blue">
            <UserCheck className="h-4 w-4" />
            Mandiri / Pasien
          </span>
        </div>

        <h2 id="patient-panel-title" className="mt-2 text-xl font-extrabold text-ink sm:text-2xl">
          Apa yang Anda rasakan?
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Pilih keluhan Anda pada papan gambar di bawah ini.
        </p>
      </header>

      {/* Main Panel Content */}
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {/* Tab Controls: Papan Visual | Gestur Kamera */}
        <div
          role="tablist"
          aria-label="Metode Input Pasien"
          className="grid grid-cols-2 rounded-control border border-edge/60 bg-soft p-1"
        >
          <button
            role="tab"
            type="button"
            id="tab-visual-board"
            aria-selected={activeSubTab === 'board'}
            aria-controls="panel-visual-board"
            onClick={() => setActiveSubTab('board')}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-extrabold transition-all ${
              activeSubTab === 'board'
                ? 'bg-brand text-brand-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            <span>Papan Visual</span>
          </button>
          <button
            role="tab"
            type="button"
            id="tab-gesture-camera"
            aria-selected={activeSubTab === 'camera'}
            aria-controls="panel-gesture-camera"
            onClick={() => setActiveSubTab('camera')}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-extrabold transition-all ${
              activeSubTab === 'camera'
                ? 'bg-brand text-brand-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span>Gestur Kamera</span>
          </button>
        </div>

        {/* Tab Panels */}
        {activeSubTab === 'board' ? (
          <div id="panel-visual-board" role="tabpanel" aria-labelledby="tab-visual-board">
            <VisualBoard />
          </div>
        ) : (
          <div
            id="panel-gesture-camera"
            role="tabpanel"
            aria-labelledby="tab-gesture-camera"
            className="flex min-h-[220px] flex-col items-center justify-center rounded-card border-2 border-dashed border-line bg-soft/80 p-6 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-control bg-tint text-brand mb-3">
              <Camera className="h-6 w-6" aria-hidden="true" />
            </div>
            <h4 className="text-base font-extrabold text-ink">Pengenalan Gestur Kamera</h4>
            <p className="mt-1 max-w-sm text-xs font-medium text-muted">
              Modul kamera dan model pengenalan isyarat BISINDO disiapkan untuk Fase 3. Papan Visual saat ini berfungsi penuh tanpa kamera.
            </p>
            <button
              type="button"
              onClick={() => setActiveSubTab('board')}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-control bg-brand px-5 py-2 text-xs font-bold text-brand-ink hover:opacity-90 transition-opacity"
            >
              Kembali ke Papan Visual
            </button>
          </div>
        )}

        {/* Symptom Summary Card */}
        <SymptomSummary isPatientView={true} />

        {/* Nurse Messages Card ("Pesan dari Petugas") - High Legibility for Deaf Patients */}
        <section
          aria-label="Pesan dari Petugas"
          className="flex flex-col gap-3 rounded-card border border-line bg-soft p-5 shadow-card"
        >
          <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-blue" aria-hidden="true" />
              <h3 className="text-base font-extrabold text-ink">Pesan dari Petugas</h3>
            </div>
            {state.nurseMessages.length > 0 && (
              <span className="text-[11px] font-bold text-muted">
                {state.nurseMessages.length} pesan
              </span>
            )}
          </div>

          <div
            className="flex flex-col gap-3"
            aria-live="polite"
            aria-atomic="false"
          >
            {state.nurseMessages.length === 0 ? (
              <div className="rounded-control border border-dashed border-line/80 bg-surface/60 p-4 text-center">
                <p className="text-sm font-medium text-muted">Belum ada pesan dari petugas.</p>
                <span className="text-xs text-muted/70">
                  Pertanyaan atau instruksi dari meja triase akan tampil di sini dengan huruf besar.
                </span>
              </div>
            ) : (
              state.nurseMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-bubble border border-line bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue uppercase tracking-wider">
                      Petugas Triase
                    </span>
                    <span className="text-[11px] font-semibold text-muted">
                      {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-ink leading-snug">{msg.text}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </article>
  );
};
