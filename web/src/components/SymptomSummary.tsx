import React from 'react';
import { useTriage } from '../state/triageContext';
import { CATALOG_BY_ID } from '../data/catalog';
import { getCatalogIcon } from '../ui/iconMap';
import { CheckCircle2, CircleDot, X, Check, Edit3 } from 'lucide-react';

interface SymptomSummaryProps {
  isPatientView?: boolean;
}

export const SymptomSummary: React.FC<SymptomSummaryProps> = ({ isPatientView = true }) => {
  const { state, dispatch } = useTriage();
  const isConfirmed = state.status === 'confirmed';

  const itemIds = isPatientView ? state.selectedItemIds : (isConfirmed ? state.confirmedItemIds : []);
  const items = itemIds.map((id) => CATALOG_BY_ID[id]).filter(Boolean);

  const grouped: Record<string, typeof items> = {};
  items.forEach((item) => {
    if (!grouped[item.kategori]) {
      grouped[item.kategori] = [];
    }
    grouped[item.kategori].push(item);
  });

  const handleRemove = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const handleConfirm = () => {
    dispatch({ type: 'CONFIRM_SUMMARY' });
  };

  const handleEdit = () => {
    dispatch({ type: 'EDIT_SUMMARY' });
  };

  return (
    <section
      aria-label="Ringkasan Keluhan"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-sm"
    >
      {/* Header bar: Title & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-ink">Ringkasan Keluhan</h3>
          {items.length > 0 && (
            <span className="rounded-badge bg-tint px-2 py-0.5 text-xs font-bold text-ink">
              {items.length}
            </span>
          )}
        </div>

        {isConfirmed ? (
          <span
            className="flex items-center gap-1.5 rounded-badge bg-ok-bg px-2.5 py-1 text-xs font-bold text-ok-text"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Telah Dikonfirmasi Pasien
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5 rounded-badge border border-dashed border-blue/70 bg-soft px-2.5 py-1 text-xs font-bold text-blue"
            role="status"
          >
            <CircleDot className="h-4 w-4 shrink-0" aria-hidden="true" />
            Belum dikonfirmasi
          </span>
        )}
      </div>

      {/* Summary Content */}
      {items.length === 0 ? (
        <div className="flex min-h-[64px] items-center justify-center rounded-control border border-dashed border-line bg-soft/40 p-3 text-center">
          <p className="text-xs font-medium text-muted">
            {isPatientView
              ? 'Belum ada pilihan. Pilih pada papan gambar.'
              : 'Menunggu pasien mengonfirmasi ringkasan keluhan.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                {category}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {catItems.map((item) => {
                  const Icon = getCatalogIcon(item.id);
                  return (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-tint/80 px-2.5 py-1 text-xs font-bold text-ink"
                    >
                      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-brand" />}
                      <span>{item.label}</span>
                      {isPatientView && (
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          aria-label={`Hapus ${item.label}`}
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-err hover:text-white transition-colors"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Action Buttons */}
      {isPatientView && (
        <div className="flex flex-col gap-2 pt-2 border-t border-line/60 sm:flex-row">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={state.selectedItemIds.length === 0 || isConfirmed}
            aria-disabled={state.selectedItemIds.length === 0 || isConfirmed}
            className={`flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-extrabold text-accent-ink transition-all ${
              state.selectedItemIds.length === 0 || isConfirmed
                ? 'cursor-not-allowed bg-accent/40 text-white/70'
                : 'bg-accent hover:opacity-95 shadow-sm active:scale-[0.99]'
            }`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Konfirmasi & Tampilkan ke Petugas
          </button>

          {isConfirmed && (
            <button
              type="button"
              onClick={handleEdit}
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-control border border-edge bg-soft px-3 py-2 text-xs font-bold text-ink hover:bg-tint active:scale-[0.99]"
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Ubah Ringkasan
            </button>
          )}
        </div>
      )}
    </section>
  );
};
