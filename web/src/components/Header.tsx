import React from 'react';
import { ShieldAlert, Activity, Columns, User, Stethoscope } from 'lucide-react';

export type ViewMode = 'split' | 'patient' | 'nurse';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode, setViewMode }) => {
  return (
    <header className="w-full border-b border-line bg-surface shadow-sm sticky top-0 z-20">
      {/* Top Clinical Navigation Bar */}
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-control bg-brand text-brand-ink">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-brand">
                SignMedic
              </span>
              <span className="rounded-badge bg-tint px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink">
                Triase IGD
              </span>
            </div>
          </div>
        </div>

        {/* Center: Clean View Switcher */}
        <nav
          aria-label="Pilihan Tampilan Layar"
          className="flex items-center rounded-control border border-edge/60 bg-soft p-1"
        >
          {/* Patient Screen Button */}
          <button
            type="button"
            onClick={() => setViewMode('patient')}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'patient'
                ? 'bg-brand text-brand-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
            aria-current={viewMode === 'patient' || viewMode === 'split' ? 'page' : undefined}
          >
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Layar Pasien</span>
          </button>

          {/* Nurse Screen Button */}
          <button
            type="button"
            onClick={() => setViewMode('nurse')}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'nurse'
                ? 'bg-brand text-brand-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
            aria-current={viewMode === 'nurse' ? 'page' : undefined}
          >
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Layar Petugas</span>
          </button>

          {/* Split Screen Button (Desktop only) */}
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`hidden min-[901px]:flex min-h-[36px] items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'split'
                ? 'bg-brand text-brand-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Columns className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Berdampingan</span>
          </button>
        </nav>

        {/* Right: Zero-Persistence Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-pill border border-line bg-soft px-2.5 py-1 text-[11px] font-semibold text-muted">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          <span>Memori RAM Saja</span>
        </div>
      </div>

      {/* Slim Integrated Disclaimer */}
      <aside
        aria-label="Pernyataan Batasan"
        className="border-t border-line/50 bg-soft/50 px-4 py-1.5 text-[11px] text-muted text-center sm:text-left"
      >
        <div className="mx-auto flex w-full max-w-[1560px] items-center justify-center sm:justify-start gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-blue" aria-hidden="true" />
          <span>
            Alat bantu komunikasi awal, bukan alat diagnosis. Data hanya tersimpan di memori halaman ini.
          </span>
        </div>
      </aside>
    </header>
  );
};
