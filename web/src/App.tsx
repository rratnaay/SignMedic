import React, { useState } from 'react';
import { Header } from './components/Header';
import { PatientView } from './components/PatientView';
import { NurseView } from './components/NurseView';
import { TriageProvider } from './state/triageContext';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patient' | 'nurse'>('patient');

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink selection:bg-brand selection:text-brand-ink">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="mx-auto w-full max-w-[1560px] flex-1 px-3 py-5 sm:px-6 lg:px-8">
        {/* Asymmetric Clinical Layout: Patient View 7 cols (~58%), Nurse View 5 cols (~42%) */}
        <div className="grid grid-cols-1 gap-5 min-[901px]:grid-cols-12 min-[901px]:gap-6">
          <div className={activeTab === 'patient' ? 'block min-[901px]:col-span-7' : 'hidden min-[901px]:block min-[901px]:col-span-7'}>
            <PatientView />
          </div>
          <div className={activeTab === 'nurse' ? 'block min-[901px]:col-span-5' : 'hidden min-[901px]:block min-[901px]:col-span-5'}>
            <NurseView />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-line bg-surface py-3 text-center text-xs font-semibold text-muted">
        <div className="mx-auto max-w-[1560px] px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SignMedic &bull; Prototipe Jembatan Komunikasi Triase BISINDO</span>
          <span>Mode Lokal 100% di Memori RAM &bull; Bebas Jejak Klinis (Zero-Persistence)</span>
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
