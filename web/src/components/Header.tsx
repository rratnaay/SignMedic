import React from 'react';
import { ShieldAlert, Activity } from 'lucide-react';

interface HeaderProps {
  activeTab: 'patient' | 'nurse';
  setActiveTab: (tab: 'patient' | 'nurse') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="w-full border-b border-line bg-surface shadow-sm">
      {/* Top Clinical Navigation Bar - Expanded Widescreen Layout */}
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Brand & Clinical Department */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-control bg-brand text-brand-ink shadow-sm">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-brand">
                SignMedic
              </span>
              <span className="rounded-badge bg-tint px-2 py-0.5 text-[11px] font-bold text-ink uppercase tracking-wider">
                IGD Triase
              </span>
            </div>
            <p className="text-xs font-medium text-muted hidden sm:block">
              Jembatan Komunikasi Pasien Tuli (BISINDO) & Petugas Kesehatan
            </p>
          </div>
        </div>

        {/* Center / Right: System Status & Mobile Segment Control */}
        <div className="flex items-center gap-3">
          {/* Status Indicator Pill */}
          <div className="hidden md:flex items-center gap-1.5 rounded-pill border border-line bg-soft px-3 py-1 text-xs font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
            <span>Memori Lokal (Zero-Persistence)</span>
          </div>

          {/* Narrow-screen segment switch (<= 900px) */}
          <nav
            aria-label="Pilihan Tampilan Layar"
            className="flex items-center rounded-control border border-edge bg-soft p-1 min-[901px]:hidden"
          >
            <button
              type="button"
              onClick={() => setActiveTab('patient')}
              className={`min-h-[40px] rounded-[8px] px-3 py-1.5 text-xs font-bold transition-colors ${
                activeTab === 'patient'
                  ? 'bg-brand text-brand-ink shadow-sm'
                  : 'text-ink hover:text-brand'
              }`}
              aria-current={activeTab === 'patient' ? 'page' : undefined}
            >
              Layar Pasien
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('nurse')}
              className={`min-h-[40px] rounded-[8px] px-3 py-1.5 text-xs font-bold transition-colors ${
                activeTab === 'nurse'
                  ? 'bg-brand text-brand-ink shadow-sm'
                  : 'text-ink hover:text-brand'
              }`}
              aria-current={activeTab === 'nurse' ? 'page' : undefined}
            >
              Layar Petugas
            </button>
          </nav>
        </div>
      </div>

      {/* Integrated Clinical Disclaimer Strip */}
      <aside
        aria-label="Pernyataan Batasan"
        className="border-t border-line/60 bg-soft/80 px-4 py-2 text-xs font-medium text-muted"
      >
        <div className="mx-auto flex w-full max-w-[1560px] items-center gap-2 sm:px-2 lg:px-4">
          <ShieldAlert className="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
          <span>
            <strong>Batasan Klinis:</strong> Alat bantu komunikasi awal, bukan alat diagnosis. Data hanya tersimpan di memori halaman ini.
          </span>
        </div>
      </aside>
    </header>
  );
};
