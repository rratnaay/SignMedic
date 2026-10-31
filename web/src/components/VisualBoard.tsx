import React, { useState } from 'react';
import { CATALOG_BY_ID } from '../data/catalog';
import { getCatalogIcon } from '../ui/iconMap';
import { Check, AlertOctagon } from 'lucide-react';
import { useTriage } from '../state/triageContext';

export const VisualBoard: React.FC = () => {
  const { state, dispatch } = useTriage();
  const selectedIds = new Set(state.selectedItemIds);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const urgentItem = CATALOG_BY_ID['kebutuhan_bantuan_segera'];

  const categories = [
    {
      id: 'keluhan',
      title: 'Keluhan Utama',
      ids: ['keluhan_sakit_nyeri', 'keluhan_mual', 'keluhan_pusing', 'keluhan_sesak_napas'],
    },
    {
      id: 'lokasi',
      title: 'Lokasi Tubuh',
      ids: ['lokasi_kepala', 'lokasi_dada', 'lokasi_perut', 'lokasi_tangan_kaki'],
    },
    {
      id: 'kebutuhan',
      title: 'Kebutuhan Triase',
      ids: ['kebutuhan_duduk_berbaring', 'kebutuhan_pendamping'],
    },
    {
      id: 'info',
      title: 'Informasi Penting',
      ids: ['info_alergi', 'info_obat_rutin'],
    },
    {
      id: 'konfirmasi',
      title: 'Konfirmasi Cepat',
      ids: ['konfirmasi_ya', 'konfirmasi_tidak', 'konfirmasi_belum_mengerti'],
    },
  ];

  const handleToggle = (id: string) => {
    dispatch({ type: 'TOGGLE_ITEM', payload: id });
  };

  const isUrgentSelected = urgentItem ? selectedIds.has(urgentItem.id) : false;

  const visibleCategories =
    activeCategory === 'all'
      ? categories
      : categories.filter((c) => c.id === activeCategory);

  return (
    <section aria-label="Papan Komunikasi Visual" className="flex flex-col gap-4">
      {/* 1. High-Priority Emergency Call Tile */}
      {urgentItem && (
        <button
          type="button"
          onClick={() => handleToggle(urgentItem.id)}
          aria-pressed={isUrgentSelected}
          className={`flex min-h-[58px] w-full items-center justify-between rounded-tile border-2 px-4 py-2.5 text-left transition-all active:scale-[0.99] ${
            isUrgentSelected
              ? 'border-err bg-err text-white shadow-sm'
              : 'border-err/70 bg-err-bg/50 text-err hover:bg-err-bg hover:border-err'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control transition-colors ${
                isUrgentSelected ? 'bg-white/20 text-white' : 'bg-err text-white'
              }`}
            >
              <AlertOctagon className="h-5 w-5 animate-pulse" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-base font-extrabold uppercase tracking-wide">
                {urgentItem.label}
              </span>
            </div>
          </div>
          {isUrgentSelected ? (
            <span className="flex items-center gap-1 rounded-badge bg-white px-2.5 py-1 text-xs font-black text-err shadow-sm">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              DIPILIH
            </span>
          ) : (
            <span className="rounded-badge border border-err/30 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-err">
              Darurat
            </span>
          )}
        </button>
      )}

      {/* 2. Quick Category Filter Pills */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold"
        aria-label="Filter Kategori Gejala"
      >
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`whitespace-nowrap rounded-pill px-3 py-1.5 transition-colors ${
            activeCategory === 'all'
              ? 'bg-brand text-brand-ink'
              : 'bg-soft text-muted hover:text-ink border border-line'
          }`}
        >
          Semua Pilihan
        </button>
        {categories.map((c) => {
          const selectedCount = c.ids.filter((id) => selectedIds.has(id)).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-1.5 transition-colors ${
                activeCategory === c.id
                  ? 'bg-brand text-brand-ink'
                  : 'bg-soft text-muted hover:text-ink border border-line'
              }`}
            >
              <span>{c.title}</span>
              {selectedCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-white">
                  {selectedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Category Grid Sections (No unnecessary text clutter) */}
      <div className="flex flex-col gap-4">
        {visibleCategories.map((cat) => {
          const items = cat.ids.map((id) => CATALOG_BY_ID[id]).filter(Boolean);

          return (
            <div key={cat.title} className="flex flex-col gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">
                {cat.title}
              </h3>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const Icon = getCatalogIcon(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      aria-pressed={isSelected}
                      className={`group relative flex min-h-[96px] flex-col justify-between rounded-tile p-3 text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'border-2 border-brand bg-brand text-brand-ink shadow-sm'
                          : 'border border-edge/60 bg-surface text-ink hover:border-brand hover:bg-soft'
                      }`}
                    >
                      {/* Top Row: Icon and Status Check */}
                      <div className="flex items-start justify-between w-full">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-control transition-colors ${
                            isSelected
                              ? 'bg-white/15 text-brand-ink'
                              : 'bg-tint text-brand group-hover:bg-brand group-hover:text-brand-ink'
                          }`}
                        >
                          {Icon && <Icon className="h-5 w-5" />}
                        </div>

                        {isSelected && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-ink"
                            title="Terpilih"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>

                      {/* Label */}
                      <span className="mt-2 text-sm font-bold leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
