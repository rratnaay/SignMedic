import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTriage } from '../state/triageContext';
import { Monitor, Smartphone, Layers, X, QrCode, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({ isOpen, onClose }) => {
  const { role, roomCode, peerConnected, createRoom, joinRoom, leaveRoom } = useTriage();
  const [pinInput, setPinInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate QR Code data URL when roomCode is active in nurse role
  useEffect(() => {
    if (roomCode && role === 'nurse' && typeof window !== 'undefined') {
      const targetUrl = `${window.location.origin}/?room=${roomCode}&role=patient`;
      QRCode.toDataURL(targetUrl, {
        width: 240,
        margin: 1,
        color: {
          dark: '#142C58',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [roomCode, role]);

  if (!isOpen) return null;

  const handleStartNurse = () => {
    setErrorMessage(null);
    createRoom();
  };

  const handleJoinPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length !== 6) {
      setErrorMessage('PIN harus terdiri dari 6 angka.');
      return;
    }
    setErrorMessage(null);
    joinRoom(cleanPin);
    onClose();
  };

  const handleSwitchToStandalone = () => {
    leaveRoom();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pairing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative flex w-full max-w-lg flex-col gap-4 rounded-panel border border-edge bg-surface p-5 sm:p-6 shadow-xl text-ink">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog koneksi"
          className="absolute right-4 top-4 rounded-control p-1 text-muted hover:bg-soft hover:text-ink transition-colors"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* State A: Room Created by Doctor/Nurse -> Display QR & PIN */}
        {role === 'nurse' && roomCode ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div>
              <span className="rounded-badge bg-tint px-2.5 py-0.5 text-xs font-bold text-brand uppercase tracking-wider">
                Mode Petugas (Host)
              </span>
              <h2 id="pairing-modal-title" className="mt-1 text-xl font-black text-ink sm:text-2xl">
                Hubungkan Layar Pasien (HP)
              </h2>
              <p className="mt-1 text-xs text-muted max-w-sm">
                Arahkan kamera HP pasien ke QR Code di bawah, atau buka aplikasi di HP dan masukkan PIN 6-angka.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center rounded-card border-2 border-line bg-white p-3 shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code untuk bergabung ke sesi ${roomCode}`}
                  className="h-48 w-48 rounded-[8px]"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-muted">
                  <QrCode className="h-12 w-12 animate-pulse" />
                </div>
              )}
            </div>

            {/* 6-Digit PIN Display */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Kode PIN Sesi Pasien
              </span>
              <div className="flex items-center gap-2 font-mono text-3xl font-black tracking-widest text-brand bg-soft px-5 py-2 rounded-control border border-line">
                <span>{roomCode.slice(0, 3)}</span>
                <span className="text-muted/60">-</span>
                <span>{roomCode.slice(3, 6)}</span>
              </div>
            </div>

            {/* Connection Status Indicator */}
            <div
              className={`inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-extrabold ${
                peerConnected
                  ? 'bg-ok-bg text-ok-text border border-ok-border'
                  : 'bg-soft text-muted border border-line'
              }`}
              role="status"
            >
              {peerConnected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-ok-text" aria-hidden="true" />
                  <span>HP Pasien Terhubung!</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
                  <span>Menunggu HP pasien tersambung...</span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex w-full flex-col gap-2 pt-2 border-t border-line/60 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-control bg-brand px-4 py-2 text-xs font-extrabold text-brand-ink hover:opacity-95 shadow-sm active:scale-[0.98]"
              >
                <span>Tampilkan Layar Petugas</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleSwitchToStandalone}
                className="min-h-[44px] flex items-center justify-center rounded-control border border-line bg-soft px-4 py-2 text-xs font-bold text-muted hover:text-ink hover:bg-tint"
              >
                Kembali ke 1 Perangkat
              </button>
            </div>
          </div>
        ) : (
          /* State B: Mode Selection Menu */
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/signmediclogo.png"
                alt="Logo SignMedic"
                className="h-9 w-9 shrink-0 rounded-control object-contain"
              />
              <div>
                <h2 id="pairing-modal-title" className="text-xl font-black text-ink sm:text-2xl leading-tight">
                  Pilih Mode Triase SignMedic
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Pilih cara Anda ingin menjalankan aplikasi pada sesi triase ini:
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Option 1: Host Mode (Laptop / Doctor) */}
              <div className="flex flex-col gap-2.5 rounded-card border-2 border-brand/50 bg-tint/30 p-4 transition-all hover:border-brand">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand text-brand-ink">
                    <Monitor className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-ink">
                      Mode Petugas (Host / Laptop)
                    </h3>
                    <p className="text-xs text-muted">
                      Tampilkan layar dokter di laptop ini, dan buat PIN/QR Code untuk HP pasien.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartNurse}
                  className="mt-1 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-control bg-brand px-4 py-2 text-xs font-extrabold text-brand-ink hover:opacity-95 shadow-sm active:scale-[0.99]"
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  <span>Buat Sesi Dokter (Dapatkan PIN & QR)</span>
                </button>
              </div>

              {/* Option 2: Client Mode (Smartphone / Patient) */}
              <div className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-4 transition-all hover:border-blue">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-soft text-blue border border-line">
                    <Smartphone className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-ink">
                      Mode Pasien (Client / HP)
                    </h3>
                    <p className="text-xs text-muted">
                      Gunakan perangkat ini khusus untuk pasien dengan memasukkan 6-digit PIN dari laptop dokter.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleJoinPatient} className="mt-1 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Masukkan 6-digit PIN..."
                      className="min-h-[42px] flex-1 font-mono tracking-widest rounded-control border border-edge/80 bg-surface px-3 py-1.5 text-center text-sm font-extrabold text-ink placeholder:text-muted/60 placeholder:tracking-normal placeholder:font-sans focus-visible:outline focus-visible:outline-3 focus-visible:outline-brand"
                    />
                    <button
                      type="submit"
                      disabled={pinInput.length !== 6}
                      className={`flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-control px-4 py-2 text-xs font-extrabold transition-all ${
                        pinInput.length !== 6
                          ? 'cursor-not-allowed bg-blue/40 text-white/70'
                          : 'bg-blue text-white hover:opacity-95 shadow-sm active:scale-[0.98]'
                      }`}
                    >
                      <span>Masuk</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {errorMessage && (
                    <p className="text-[11px] font-bold text-err" role="alert">
                      {errorMessage}
                    </p>
                  )}
                </form>
              </div>

              {/* Option 3: Standalone Mode (1 Device) */}
              <div className="flex items-center justify-between rounded-card border border-line bg-soft/50 p-3.5">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-muted" aria-hidden="true" />
                  <div>
                    <h4 className="text-xs font-bold text-ink">Mode 1 Perangkat (Standar)</h4>
                    <p className="text-[11px] text-muted">Gunakan berdampingan di 1 layar tanpa menghubungkan PIN.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSwitchToStandalone}
                  className="flex min-h-[36px] items-center justify-center rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:bg-soft"
                >
                  Pilih
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
