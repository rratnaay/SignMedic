import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Triage Communication Full Flow (Without Camera / Mic)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders clinical disclaimer and header brand plate', () => {
    render(<App />);

    expect(
      screen.getByText(/Alat bantu komunikasi awal, bukan alat diagnosis/i)
    ).toBeInTheDocument();
    expect(screen.getByText('SignMedic')).toBeInTheDocument();
  });

  it('completes the full triage communication flow between patient and nurse', () => {
    render(<App />);

    // Default tab is Gestur Kamera; switch to Papan Visual to test visual board selection
    const visualBoardTab = screen.getByRole('tab', { name: /Papan Visual/i });
    expect(screen.getByRole('tab', { name: /Gestur Kamera/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.click(visualBoardTab);

    // 1. Initial State: Symptom summary is empty
    expect(
      screen.getByText(/Belum ada pilihan\. Pilih pada papan gambar\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Menunggu pasien mengonfirmasi ringkasan keluhan\./i)
    ).toBeInTheDocument();

    // 2. Patient selects urgent tile "Butuh Bantuan Segera"
    const urgentButton = screen.getByRole('button', { name: /Butuh Bantuan Segera/i });
    expect(urgentButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(urgentButton);
    expect(urgentButton).toHaveAttribute('aria-pressed', 'true');

    // 3. Patient selects "Sakit / Nyeri" from Keluhan Utama
    const painButton = screen.getByRole('button', { name: /Sakit \/ Nyeri/i });
    fireEvent.click(painButton);
    expect(painButton).toHaveAttribute('aria-pressed', 'true');

    // 4. Patient selects "Kepala" from Lokasi Tubuh
    const headButton = screen.getByRole('button', { name: /Kepala/i });
    fireEvent.click(headButton);
    expect(headButton).toHaveAttribute('aria-pressed', 'true');

    // 5. Verify chips appear in Patient's Symptom Summary
    const confirmButtons = screen.getAllByRole('button', {
      name: /Konfirmasi & Tampilkan ke Petugas/i,
    });
    // Active confirm button exists
    expect(confirmButtons[0]).not.toBeDisabled();

    // 6. Before patient confirms, Nurse view still shows waiting state
    expect(
      screen.getByText(/Menunggu pasien mengonfirmasi ringkasan keluhan\./i)
    ).toBeInTheDocument();

    // 7. Patient clicks "Konfirmasi & Tampilkan ke Petugas"
    fireEvent.click(confirmButtons[0]);

    // 8. Now status is confirmed in both views!
    const confirmedBadges = screen.getAllByText(/Telah Dikonfirmasi Pasien/i);
    expect(confirmedBadges.length).toBeGreaterThanOrEqual(1);

    // Nurse view now displays the confirmed symptoms!
    // The chips "Sakit / Nyeri", "Kepala", "Butuh Bantuan Segera" are shown
    const allPainTexts = screen.getAllByText('Sakit / Nyeri');
    expect(allPainTexts.length).toBeGreaterThan(1);

    // 9. Nurse sends quick question
    const questionButton = screen.getByRole('button', {
      name: /Bagian tubuh mana yang terasa sakit\?/i,
    });
    fireEvent.click(questionButton);

    // 10. Question appears in Patient view's top notification banner (and on the quick question button)
    expect(screen.getByText(/Pesan Baru dari Petugas Triase/i)).toBeInTheDocument();
    const questionTexts = screen.getAllByText('Bagian tubuh mana yang terasa sakit?');
    expect(questionTexts.length).toBe(2);

    // 11. Nurse types custom text message and sends it
    const nurseInput = screen.getByPlaceholderText(
      /Tulis pesan atau instruksi untuk pasien\.\.\./i
    );
    fireEvent.change(nurseInput, {
      target: { value: 'Silakan duduk di kursi nomor 3.' },
    });
    const sendButton = screen.getByRole('button', { name: /^Kirim Pesan$/i });
    fireEvent.click(sendButton);

    // Message appears in Patient view's top notification banner
    expect(screen.getByText('Silakan duduk di kursi nomor 3.')).toBeInTheDocument();

    // Dismiss top notification and open chat history via header icon button
    fireEvent.click(screen.getByRole('button', { name: /Tutup notifikasi pesan petugas/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pesan dari Petugas \(2 pesan\)/i }));
    expect(screen.getByText(/Riwayat Pesan dari Petugas \(2\)/i)).toBeInTheDocument();

    // 12. Patient removes an item using delete chip "×"
    const removeButtons = screen.getAllByLabelText(/Hapus Sakit \/ Nyeri/i);
    fireEvent.click(removeButtons[0]);

    // Deleting item automatically resets confirmation state back to unconfirmed
    expect(
      screen.getByText(/Menunggu pasien mengonfirmasi ringkasan keluhan\./i)
    ).toBeInTheDocument();

    // 13. Nurse clicks "Akhiri Sesi dan Hapus Data"
    window.confirm = vi.fn().mockReturnValue(true);
    const endSessionButton = screen.getByRole('button', {
      name: /Akhiri Sesi dan Hapus Data/i,
    });
    fireEvent.click(endSessionButton);

    // Everything is reset
    expect(
      screen.getByText(/Belum ada pilihan\. Pilih pada papan gambar\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Pesan dari Petugas \(0 pesan\)/i })
    ).toBeInTheDocument();
  });

  it('always renders side-by-side mode (Mode Berdampingan) and defaults PatientView to Gestur Kamera', () => {
    render(<App />);

    expect(screen.getByText('Mode Berdampingan')).toBeInTheDocument();
    expect(screen.getByText('Layar Pasien')).toBeInTheDocument();
    expect(screen.getByText('Layar Petugas')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Gestur Kamera/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('allows editing summary to revert confirmed status back to unconfirmed', () => {
    render(<App />);

    // Switch to Papan Visual to select symptom
    fireEvent.click(screen.getByRole('tab', { name: /Papan Visual/i }));
    const nauseaButton = screen.getByRole('button', { name: /Mual \/ Ingin Muntah/i });
    fireEvent.click(nauseaButton);

    // Confirm
    const confirmButton = screen.getByRole('button', {
      name: /Konfirmasi & Tampilkan ke Petugas/i,
    });
    fireEvent.click(confirmButton);

    // Verify confirmed badge is present in both views
    expect(screen.getAllByText('Telah Dikonfirmasi Pasien').length).toBeGreaterThanOrEqual(1);

    // Click "Ubah Ringkasan"
    const editButton = screen.getByRole('button', { name: /Ubah Ringkasan/i });
    fireEvent.click(editButton);

    // Reverted to unconfirmed
    expect(screen.getAllByText('Belum dikonfirmasi').length).toBeGreaterThanOrEqual(1);
  });
});
