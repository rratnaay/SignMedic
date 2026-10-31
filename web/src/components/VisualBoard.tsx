import React from 'react';
import { CATALOG_BY_ID } from '../data/catalog';
import { getCatalogIcon } from '../ui/iconMap';
import { Check, AlertOctagon } from 'lucide-react';
import { useTriage } from '../state/triageContext';

export const VisualBoard: React.FC = () => {
  const { state, dispatch } = useTriage();
  const selectedIds = new Set(state.selectedItemIds);

  const urgentItem = CATALOG_BY_ID['kebutuhan_bantuan_segera'];

  const categories = [
    {
      title: 'Keluhan Utama',
      description: 'Gejala utama yang Anda rasakan',
      ids: ['keluhan_sakit_nyeri', 'keluhan_mual', 'keluhan_pusing', 'keluhan_sesak_napas'],
    },
    {
      title: 'Lokasi Tubuh',
      description: 'Bagian tubuh yang sakit atau tidak nyaman',
      ids: ['lokasi_kepala', 'lokasi_dada', 'lokasi_perut', 'lokasi_tangan_kaki'],
    },
    {
      title: 'Kebutuhan Triase',
      description: 'Kebutuhan posisi atau pendampingan saat ini',
      ids: ['kebutuhan_duduk_berbaring', 'kebutuhan_pendamping'],
    },
    {
      title: 'Informasi Penting',
      description: 'Riwayat medis untuk keselamatan Anda',
      ids: ['info_alergi', 'info_obat_rutin'],
    },
    {
      title: 'Konfirmasi Cepat',
      description: 'Respons singkat untuk pertanyaan petugas',
      ids: ['konfirmasi_ya', 'konfirmasi_tidak', 'konfirmasi_belum_mengerti'],
    },
  ];

  const handleToggle = (id: string) => {
    dispatch({ type: 'TOGGLE_ITEM', payload: id });
  };

  const isUrgentSelected = urgentItem ? selectedIds.has(urgentItem.id) : false;

  return (
    <section aria-label="Papan Komunikasi Visual" className="flex flex-col gap-6">
      {/* 1. High-Priority Emergency Call Tile */}
      {urgentItem && (
        <button
          type="button"
          onClick={() => handleToggle(urgentItem.id)}
          aria-pressed={isUrgentSelected}
          className={`group relative flex min-h-[64px] w-full items-center justify-between rounded-tile border-2 px-5 py-3 text-left transition-all active:scale-[0.99] ${
            isUrgentSelected
              ? 'border-err bg-err text-white shadow-md'
              : 'border-err/80 bg-err-bg/60 text-err hover:bg-err-bg hover:border-err'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors ${
                isUrgentSelected ? 'bg-white/20 text-white' : 'bg-err text-white'
              }`}
            >
              <AlertOctagon className="h-6 w-6 animate-pulse" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-base font-extrabold uppercase tracking-wide sm:text-lg">
                {urgentItem.label}
              </span>
              <span className={`text-xs font-semibold ${isUrgentSelected ? 'text-white/90' : 'text-err/80'}`}>
                Tekan tombol ini jika Anda membutuhkan pertolongan medis segera
              </span>
            </div>
          </div>
          {isUrgentSelected ? (
            <span className="flex items-center gap-1.5 rounded-badge bg-white px-3 py-1 text-xs font-extrabold text-err shadow-sm">
              <Check className="h-4 w-4" aria-hidden="true" />
              DIPILIH
            </span>
          ) : (
            <span className="hidden sm:inline-block rounded-badge border border-err/40 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-err">
              Darurat
            </span>
          )}
        </button>
      )}

      {/* 2. Structured Category Sections */}
      {categories.map((cat) => {
        const items = cat.ids
          .map((id) => CATALOG_BY_ID[id])
          .filter(Boolean);

        return (
          <div key={cat.title} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between border-b border-line/60 pb-1.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">
                {cat.title}
              </h3>
              <span className="text-[11px] font-medium text-muted hidden sm:inline">
                {cat.description}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const Icon = getCatalogIcon(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggle(item.id)}
                    aria-pressed={isSelected}
                    className={`group relative flex min-h-[104px] flex-col justify-between rounded-tile p-3.5 text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-2 border-brand bg-brand text-brand-ink shadow-md'
                        : 'border-[1.5px] border-edge/70 bg-surface text-ink hover:border-brand hover:bg-soft hover:shadow-card'
                    }`}
                  >
                    {/* Top Row: Icon and Status Pill */}
                    <div className="flex items-start justify-between w-full">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-control transition-colors ${
                          isSelected
                            ? 'bg-white/15 text-brand-ink'
                            : 'bg-tint text-brand group-hover:bg-brand group-hover:text-brand-ink'
                        }`}
                      >
                        {Icon && <Icon className="h-5 w-5" />}
                      </div>

                      {isSelected && (
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm"
                          title="Terpilih"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </div>

                    {/* Bottom: Label */}
                    <div className="mt-3">
                      <span className="block text-sm font-bold leading-tight">
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
};
