import React from 'react';
import { ShieldAlert, Activity, Columns } from 'lucide-react';

export const Header: React.FC = () => {
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

        {/* Right: Split Mode & Zero-Persistence Indicators */}
        <div className="flex items-center gap-2">
          <div
            aria-label="Mode Tampilan Aktif"
            className="inline-flex items-center gap-1.5 rounded-control border border-line bg-soft px-3 py-1.5 text-xs font-bold text-ink"
          >
            <Columns className="h-3.5 w-3.5 text-blue" aria-hidden="true" />
            <span>Mode Berdampingan</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-pill border border-line bg-soft px-2.5 py-1 text-[11px] font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            <span>Memori RAM Saja</span>
          </div>
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
