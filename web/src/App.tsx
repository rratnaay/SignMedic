import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { PatientView } from './components/PatientView';
import { NurseView } from './components/NurseView';
import { TriageProvider, useTriage } from './state/triageContext';
import { User, Stethoscope, ShieldAlert } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { role } = useTriage();
  const [mobileTab, setMobileTab] = useState<'patient' | 'nurse'>('patient');
  const sliderRef = useRef<HTMLDivElement | null>(null);

  // Sync mobileTab when user swipes natively on mobile
  const handleScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, clientWidth } = sliderRef.current;
    if (clientWidth > 0) {
      const pageIndex = Math.round(scrollLeft / clientWidth);
      setMobileTab(pageIndex === 0 ? 'patient' : 'nurse');
    }
  };

  const scrollToTab = (tab: 'patient' | 'nurse') => {
    setMobileTab(tab);
    if (!sliderRef.current) return;
    const targetLeft = tab === 'patient' ? 0 : sliderRef.current.clientWidth;
    sliderRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink selection:bg-brand selection:text-brand-ink">
      <Header />

      <main className="mx-auto w-full max-w-[1560px] flex-1 px-3 py-3 sm:px-6">
        {/* Scenario A: Dedicated Patient View (Client Device / HP Pasien) */}
        {role === 'patient' ? (
          <div className="mx-auto w-full max-w-3xl py-2">
            <PatientView />
          </div>
        ) : (
          /* Scenario B: Doctor Monitoring Dashboard (Host / Standalone Mode)
             Displays both Layar Pasien (mirroring patient inputs in real-time) and Layar Petugas */
          <>
            {/* Mobile Navigation Tabs (< 901px) */}
            <div className="min-[901px]:hidden mb-3">
              <div
                role="tablist"
                aria-label="Pilihan Layar Mobile"
                className="flex rounded-control border border-edge/60 bg-soft p-1 shadow-xs"
              >
                <button
                  role="tab"
                  type="button"
                  aria-selected={mobileTab === 'patient'}
                  onClick={() => scrollToTab('patient')}
                  className={`flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-[8px] text-xs font-extrabold transition-all ${
                    mobileTab === 'patient'
                      ? 'bg-brand text-brand-ink shadow-sm'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sisi Pasien</span>
                </button>
                <button
                  role="tab"
                  type="button"
                  aria-selected={mobileTab === 'nurse'}
                  onClick={() => scrollToTab('nurse')}
                  className={`flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-[8px] text-xs font-extrabold transition-all ${
                    mobileTab === 'nurse'
                      ? 'bg-brand text-brand-ink shadow-sm'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sisi Petugas</span>
                </button>
              </div>
            </div>

            {/* Unified Responsive Container:
                - Mobile (<901px): Swipeable horizontal carousel (snap-x snap-mandatory)
                - Desktop (>=901px): 12-column side-by-side grid */}
            <div
              ref={sliderRef}
              onScroll={handleScroll}
              className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar min-[901px]:grid min-[901px]:grid-cols-12 min-[901px]:gap-6 min-[901px]:overflow-visible"
            >
              {/* Patient View Container (Mirrors HP Pasien in real-time) */}
              <div className="w-full shrink-0 snap-start min-[901px]:w-auto min-[901px]:shrink min-[901px]:col-span-7">
                <PatientView />
              </div>

              {/* Nurse View Container */}
              <div className="w-full shrink-0 snap-start min-[901px]:w-auto min-[901px]:shrink min-[901px]:col-span-5">
                <NurseView />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-line bg-surface py-3 text-center text-xs text-muted">
        <div className="mx-auto max-w-[1560px] px-4 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px]">
          <div className="flex items-center justify-center gap-1.5 font-semibold text-ink">
            <span>SignMedic &bull; Alat Bantu Komunikasi Triase BISINDO</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-muted">
            <ShieldAlert className="h-3.5 w-3.5 text-blue shrink-0" aria-hidden="true" />
            <span>Peringatan: Seluruh data hanya tersimpan sementara di memori RAM halaman ini (Zero-Persistence).</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <TriageProvider>
      <AppContent />
    </TriageProvider>
  );
};

export default App;
