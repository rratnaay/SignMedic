import React, { useState, useEffect } from 'react';
import { VisualBoard } from './VisualBoard';
import { CameraGesturePanel } from './CameraGesturePanel';
import { SymptomSummary } from './SymptomSummary';
import { useTriage } from '../state/triageContext';
import { LayoutGrid, Camera, MessageSquareText, Bell, X } from 'lucide-react';

export const PatientView: React.FC = () => {
  const { state } = useTriage();
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'camera'>('camera');
  const [dismissedMessageId, setDismissedMessageId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const latestMessage = state.nurseMessages[0] ?? null;
  const hasActiveNotification =
    Boolean(latestMessage) && dismissedMessageId !== latestMessage.id;

  useEffect(() => {
    if (state.nurseMessages.length === 0) {
      setDismissedMessageId(null);
      setIsHistoryOpen(false);
    }
  }, [state.nurseMessages.length]);

  const handleToggleHistory = () => {
    setIsHistoryOpen((prev) => !prev);
    if (latestMessage) {
      setDismissedMessageId(latestMessage.id);
    }
  };

  return (
    <article
      aria-labelledby="patient-panel-title"
      className="flex flex-col rounded-panel border border-line bg-surface shadow-sm overflow-hidden"
    >
      {/* Panel Header */}
      <header className="border-b border-line bg-soft/70 px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="patient-panel-title" className="text-xl font-extrabold text-ink sm:text-2xl">
              Apa yang Anda rasakan?
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Gunakan gestur tangan di kamera atau pilih pada papan gambar di bawah ini.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleHistory}
              aria-expanded={isHistoryOpen}
              aria-label={`Pesan dari Petugas (${state.nurseMessages.length} pesan)`}
              className={`relative inline-flex min-h-[36px] items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-extrabold transition-colors ${
                hasActiveNotification
                  ? 'border-blue bg-tint text-ink'
                  : isHistoryOpen
                  ? 'border-brand bg-brand text-brand-ink'
                  : 'border-edge/60 bg-surface text-ink hover:bg-soft'
              }`}
            >
              <MessageSquareText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Pesan Petugas</span>
              {state.nurseMessages.length > 0 && (
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-pill px-1.5 text-[11px] font-extrabold ${
                    isHistoryOpen
                      ? 'bg-surface text-brand'
                      : 'bg-brand text-brand-ink'
                  }`}
                >
                  {state.nurseMessages.length}
                </span>
              )}
            </button>

            <span className="rounded-badge bg-tint px-2.5 py-1 text-xs font-bold text-ink">
              Layar Pasien
            </span>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Top Notification Banner for Latest Nurse Message */}
        {hasActiveNotification && latestMessage && !isHistoryOpen && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col gap-2 rounded-card border-2 border-blue bg-tint/70 p-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-ink">
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand">
                  Pesan Baru dari Petugas Triase
                </span>
                <span className="text-[11px] font-semibold text-muted">
                  {new Date(latestMessage.timestamp).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {state.nurseMessages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleToggleHistory}
                    className="rounded-control border border-edge/60 bg-surface px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-soft"
                  >
                    Riwayat ({state.nurseMessages.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedMessageId(latestMessage.id)}
                  aria-label="Tutup notifikasi pesan petugas"
                  className="inline-flex items-center gap-1 rounded-control border border-edge/60 bg-surface px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-soft"
                >
                  <span>Tutup</span>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p className="text-base font-extrabold text-ink leading-snug sm:text-lg">
              {latestMessage.text}
            </p>
          </div>
        )}

        {/* Collapsible Nurse Messages History Drawer (Opened via Header Chat Icon) */}
        {isHistoryOpen && (
          <section
            aria-label="Pesan dari Petugas"
            className="flex flex-col gap-2.5 rounded-card border border-blue/50 bg-soft p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-blue" aria-hidden="true" />
                <h3 className="text-sm font-extrabold text-ink">
                  Riwayat Pesan dari Petugas ({state.nurseMessages.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                aria-label="Tutup riwayat pesan petugas"
                className="inline-flex items-center gap-1 rounded-control border border-edge/60 bg-surface px-2.5 py-1 text-xs font-bold text-ink hover:bg-soft"
              >
                <span>Tutup</span>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div
              className="flex max-h-56 flex-col gap-2 overflow-y-auto"
              aria-live="polite"
              aria-atomic="false"
            >
              {state.nurseMessages.length === 0 ? (
                <p className="text-xs text-muted italic py-1">Belum ada pesan dari petugas.</p>
              ) : (
                state.nurseMessages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`rounded-bubble border p-3 shadow-sm ${
                      idx === 0
                        ? 'border-blue/40 bg-surface'
                        : 'border-line bg-surface/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-blue uppercase tracking-wider">
                        Petugas Triase {idx === 0 ? '(Terbaru)' : ''}
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
        )}

        {/* Tab Controls: Gestur Kamera (Default) | Papan Visual */}
        <div
          role="tablist"
          aria-label="Metode Input Pasien"
          className="grid grid-cols-2 rounded-control border border-edge/60 bg-soft p-1 max-w-sm"
        >
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
      </div>
    </article>
  );
};
