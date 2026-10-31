import React, { useState } from 'react';
import { Header, ViewMode } from './components/Header';
import { PatientView } from './components/PatientView';
import { NurseView } from './components/NurseView';
import { TriageProvider } from './state/triageContext';

export const AppContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink selection:bg-brand selection:text-brand-ink">
      <Header viewMode={viewMode} setViewMode={setViewMode} />

      <main className="mx-auto w-full max-w-[1560px] flex-1 px-3 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-5 min-[901px]:grid-cols-12 min-[901px]:gap-6">
          {/* Patient View Container */}
          <div
            className={
              viewMode === 'nurse'
                ? 'hidden'
                : viewMode === 'split'
                ? 'block min-[901px]:col-span-7'
                : 'block col-span-12 mx-auto w-full max-w-4xl'
            }
          >
            <PatientView />
          </div>

          {/* Nurse View Container */}
          <div
            className={
              viewMode === 'patient'
                ? 'hidden'
                : viewMode === 'split'
                ? 'block min-[901px]:col-span-5'
                : 'block col-span-12 mx-auto w-full max-w-2xl'
            }
          >
            <NurseView />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-line bg-surface py-2.5 text-center text-xs text-muted">
        <div className="mx-auto max-w-[1560px] px-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <span>SignMedic &bull; Alat Bantu Komunikasi Triase BISINDO</span>
          <span>Zero-Persistence (Data hanya di RAM)</span>
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
