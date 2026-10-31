import { describe, it, expect } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import App from '../App';

describe('BroadcastChannel Tab Synchronization', () => {
  it('synchronizes state between two independent App instances (simulating two browser tabs)', async () => {
    // Tab 1 (e.g. Patient's tablet/tab)
    const tab1 = render(<App />);

    // Tab 2 (e.g. Nurse's monitor/tab)
    const tab2 = render(<App />);

    // In Tab 1, switch to Papan Visual and select a symptom
    fireEvent.click(tab1.getAllByRole('tab', { name: /Papan Visual/i })[0]);
    const tab1PainButton = tab1.getAllByRole('button', { name: /Sakit \/ Nyeri/i })[0];
    fireEvent.click(tab1PainButton);

    // In Tab 1, click confirm
    const tab1ConfirmButton = tab1.getAllByRole('button', {
      name: /Konfirmasi & Tampilkan ke Petugas/i,
    })[0];
    fireEvent.click(tab1ConfirmButton);

    // Wait for microtask broadcast dispatch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    // In Tab 2, the status should have synchronized to 'Telah Dikonfirmasi Pasien'
    const tab2ConfirmedBadges = tab2.getAllByText('Telah Dikonfirmasi Pasien');
    expect(tab2ConfirmedBadges.length).toBeGreaterThanOrEqual(1);

    // In Tab 2, nurse sends a quick question
    const tab2QuestionButton = tab2.getAllByRole('button', {
      name: /Apa keluhan utama yang Anda rasakan\?/i,
    })[0];
    fireEvent.click(tab2QuestionButton);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    // In Tab 1, the question should be visible in patient's messages
    const tab1QuestionTexts = tab1.getAllByText('Apa keluhan utama yang Anda rasakan?');
    expect(tab1QuestionTexts.length).toBeGreaterThanOrEqual(1);
  });
});
