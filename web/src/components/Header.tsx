import React, { useState } from 'react';
import { Smartphone, QrCode, CheckCircle2, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { useTriage } from '../state/triageContext';
import { PairingModal } from './PairingModal';

export const Header: React.FC = () => {
  const { role, roomCode, peerConnected, leaveRoom } = useTriage();
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);

  return (
    <>
      <header className="w-full border-b border-line bg-white shadow-xs sticky top-0 z-40">
        {/* Top Clinical Navigation Bar */}
        <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between px-3 py-2 sm:px-6 sm:py-2.5">
          {/* Left: Brand & Medical Disclaimer Subtitle */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/signmediclogo.png"
              alt="Logo SignMedic"
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-control object-contain"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-brand truncate">
                  SignMedic
                </span>
                <span className="rounded-badge bg-tint px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-ink shrink-0">
                  Triase IGD
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-muted leading-tight mt-0.5 truncate hidden xs:block sm:block">
                Alat bantu komunikasi awal, bukan alat diagnosis
              </p>
            </div>
          </div>

          {/* Right: Pairing & Role Status Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
                {/* PIN Button: on mobile abbreviated to barcode/QR icon, on desktop shows full PIN text */}
                <button
                  type="button"
                  onClick={() => setIsPairingOpen(true)}
                  aria-label={`PIN: ${roomCode ? `${roomCode.slice(0, 3)}-${roomCode.slice(3, 6)}` : '---'}`}
                  title={`PIN Sesi: ${roomCode ? `${roomCode.slice(0, 3)}-${roomCode.slice(3, 6)}` : '---'} (Klik untuk melihat QR Code)`}
                  className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-control border border-brand/50 bg-tint px-2 py-1 sm:px-2.5 text-xs font-extrabold text-ink hover:bg-brand hover:text-brand-ink transition-colors"
                >
                  <QrCode className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    PIN: {roomCode ? `${roomCode.slice(0, 3)}-${roomCode.slice(3, 6)}` : '---'}
                  </span>
                </button>

                <div
                  className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-1 sm:px-2.5 text-[10px] sm:text-[11px] font-bold ${
                    peerConnected
                      ? 'bg-ok-bg text-ok-text border border-ok-border'
                      : 'bg-soft text-muted border border-line'
                  }`}
                  title={peerConnected ? 'HP Pasien Terhubung' : 'Menunggu HP Pasien'}
                >
                  {peerConnected ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-ok-text shrink-0" />
                      <span className="hidden sm:inline">HP Terhubung</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand shrink-0" />
                      <span className="hidden sm:inline">Menunggu HP</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={leaveRoom}
                  className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center gap-1 rounded-control border border-line bg-soft px-2 py-1 text-xs font-semibold text-muted hover:text-ink hover:bg-surface"
                  title="Kembali ke mode 1 perangkat"
                  aria-label="Ganti Mode ke 1 perangkat"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ganti Mode</span>
                </button>
              </div>
            )}

            {role === 'patient' && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-pill bg-ok-bg px-2 py-1 sm:px-2.5 text-[10px] sm:text-[11px] font-bold text-ok-text border border-ok-border"
                  title="Terhubung ke Petugas"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-ok-text shrink-0" />
                  <span className="hidden sm:inline">Terhubung ke Petugas</span>
                </span>

                {/* Exit button: icon keluar saja */}
                <button
                  type="button"
                  onClick={leaveRoom}
                  aria-label="Keluar dari sesi"
                  title="Keluar dari sesi"
                  className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-control border border-line bg-soft px-2 py-1 text-xs font-semibold text-muted hover:text-err hover:bg-err-bg hover:border-err/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
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
