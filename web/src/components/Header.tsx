import React, { useState } from 'react';
import { Smartphone, QrCode, CheckCircle2, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { useTriage } from '../state/triageContext';
import { PairingModal } from './PairingModal';

export const Header: React.FC = () => {
  const { role, roomCode, peerConnected, leaveRoom } = useTriage();
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);

  return (
    <>
      <header className="w-full border-b border-line bg-surface shadow-xs sticky top-0 z-20">
        {/* Top Clinical Navigation Bar */}
        <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between px-3 py-2 sm:px-6 sm:py-2.5">
          {/* Left: Brand & Medical Disclaimer Subtitle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/signmediclogo.png"
              alt="Logo SignMedic"
              className="h-9 w-9 shrink-0 rounded-control object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-brand">
                  SignMedic
                </span>
                <span className="rounded-badge bg-tint px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-ink">
                  Triase IGD
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-muted leading-tight mt-0.5">
                Alat bantu komunikasi awal, bukan alat diagnosis
              </p>
            </div>
          </div>

          {/* Right: Pairing & Role Status Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {role === 'standalone' && (
              <button
                type="button"
                onClick={() => setIsPairingOpen(true)}
                aria-label="Hubungkan HP Pasien"
                title="Hubungkan HP Pasien"
                className="inline-flex min-h-[36px] min-w-[36px] sm:min-w-0 items-center justify-center gap-1.5 rounded-control border border-edge bg-soft px-2.5 py-1.5 sm:px-3 text-xs font-extrabold text-ink hover:bg-tint hover:border-brand transition-all active:scale-[0.98]"
              >
                <Smartphone className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Hubungkan HP Pasien</span>
              </button>
            )}

            {role === 'nurse' && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setIsPairingOpen(true)}
                  className="inline-flex min-h-[34px] items-center gap-1 sm:gap-1.5 rounded-control border border-brand/50 bg-tint px-2 py-1 sm:px-2.5 text-xs font-extrabold text-ink hover:bg-brand hover:text-brand-ink transition-colors"
                  title="Klik untuk melihat QR Code & PIN sesi"
                >
                  <QrCode className="h-3.5 w-3.5 text-brand" />
                  <span>PIN: {roomCode ? `${roomCode.slice(0, 3)}-${roomCode.slice(3, 6)}` : '---'}</span>
                </button>

                <div
                  className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold ${
                    peerConnected
                      ? 'bg-ok-bg text-ok-text border border-ok-border'
                      : 'bg-soft text-muted border border-line'
                  }`}
                >
                  {peerConnected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-ok-text" />
                      <span className="hidden sm:inline">HP Terhubung</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-brand" />
                      <span className="hidden sm:inline">Menunggu HP</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={leaveRoom}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-control border border-line bg-soft px-2 py-1 text-xs font-semibold text-muted hover:text-ink hover:bg-surface"
                  title="Kembali ke mode 1 perangkat"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="hidden sm:inline">Ganti Mode</span>
                </button>
              </div>
            )}

            {role === 'patient' && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="rounded-badge bg-tint px-2 py-1 text-[11px] sm:text-xs font-bold text-ink">
                  Mode Pasien
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-ok-bg px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-ok-text border border-ok-border">
                  <CheckCircle2 className="h-3 w-3 text-ok-text" />
                  <span className="hidden sm:inline">Terhubung ke Petugas</span>
                </span>
                <button
                  type="button"
                  onClick={leaveRoom}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-control border border-line bg-soft px-2 py-1 text-xs font-semibold text-muted hover:text-err hover:bg-surface"
                  title="Keluar dari sesi"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <PairingModal isOpen={isPairingOpen} onClose={() => setIsPairingOpen(false)} />
    </>
  );
};
