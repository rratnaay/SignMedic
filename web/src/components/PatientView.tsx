import React, { useState } from 'react';
import { VisualBoard } from './VisualBoard';
import { CameraGesturePanel } from './CameraGesturePanel';
import { SymptomSummary } from './SymptomSummary';
import { useTriage } from '../state/triageContext';
import { LayoutGrid, Camera, MessageSquareText } from 'lucide-react';

export const PatientView: React.FC = () => {
  const { state } = useTriage();
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'camera'>('board');

  return (
    <article
      aria-labelledby="patient-panel-title"
      className="flex flex-col rounded-panel border border-line bg-surface shadow-sm overflow-hidden"
    >
      {/* Panel Header */}
      <header className="border-b border-line bg-soft/70 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="patient-panel-title" className="text-xl font-extrabold text-ink sm:text-2xl">
              Apa yang Anda rasakan?
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Pilih keluhan Anda pada papan gambar di bawah ini.
            </p>
          </div>

          <span className="rounded-badge bg-tint px-2.5 py-1 text-xs font-bold text-ink">
            Layar Pasien
          </span>
        </div>
      </header>

      {/* Main Panel Content */}
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Tab Controls: Papan Visual | Gestur Kamera */}
        <div
          role="tablist"
          aria-label="Metode Input Pasien"
          className="grid grid-cols-2 rounded-control border border-edge/60 bg-soft p-1 max-w-sm"
        >
          <button
            role="tab"
            type="button"
            id="tab-visual-board"
            aria-selected={activeSubTab === 'board'}
            aria-controls="panel-visual-board"
            onClick={() => setActiveSubTab('board')}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-extrabold transition-all ${
              activeSubTab === 'board'
                ? 'bg-brand text-brand-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Papan Visual</span>
          </button>
          <button
            role="tab"
            type="button"
            id="tab-gesture-camera"
            aria-selected={activeSubTab === 'camera'}
            aria-controls="panel-gesture-camera"
            onClick={() => setActiveSubTab('camera')}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-extrabold transition-all ${
              activeSubTab === 'camera'
                ? 'bg-brand text-brand-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Gestur Kamera</span>
          </button>
        </div>

        {/* Tab Panels */}
        {activeSubTab === 'board' ? (
          <div id="panel-visual-board" role="tabpanel" aria-labelledby="tab-visual-board">
            <VisualBoard />
          </div>
        ) : (
          <div id="panel-gesture-camera" role="tabpanel" aria-labelledby="tab-gesture-camera">
            <CameraGesturePanel onSwitchToBoard={() => setActiveSubTab('board')} />
          </div>
        )}

        {/* Symptom Summary Card */}
        <SymptomSummary isPatientView={true} />

        {/* Nurse Messages Card ("Pesan dari Petugas") */}
        <section
          aria-label="Pesan dari Petugas"
          className="flex flex-col gap-2.5 rounded-card border border-line bg-soft p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-line/60 pb-2">
            <MessageSquareText className="h-4 w-4 text-blue" aria-hidden="true" />
            <h3 className="text-sm font-extrabold text-ink">Pesan dari Petugas</h3>
          </div>

          <div
            className="flex flex-col gap-2"
            aria-live="polite"
            aria-atomic="false"
          >
            {state.nurseMessages.length === 0 ? (
              <p className="text-xs text-muted italic py-1">Belum ada pesan dari petugas.</p>
            ) : (
              state.nurseMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-bubble border border-line bg-surface p-3.5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-blue uppercase tracking-wider">
                      Petugas Triase
                    </span>
                    <span className="text-[10px] text-muted">
                      {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-base font-bold text-ink leading-snug">{msg.text}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </article>
  );
};
