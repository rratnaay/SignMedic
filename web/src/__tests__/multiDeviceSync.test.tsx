import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../App';

describe('Multi-Device Pairing & Role Switching (Host/Client/Standalone)', () => {
  beforeEach(() => {
    // Reset window.location
    window.history.pushState({}, '', '/');
  });

  it('renders Standalone mode by default with Hubungkan HP Pasien button', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /Hubungkan HP Pasien/i })).toBeInTheDocument();
    expect(screen.getByText('Layar Pasien')).toBeInTheDocument();
    expect(screen.getByText('Layar Petugas')).toBeInTheDocument();
  });

  it('allows opening the pairing modal and creating a Doctor Session (PIN & QR Code)', async () => {
    render(<App />);

    const openPairingBtn = screen.getByRole('button', { name: /Hubungkan HP Pasien/i });
    fireEvent.click(openPairingBtn);

    expect(screen.getByText('Pilih Mode Triase SignMedic')).toBeInTheDocument();

    // Click Create Doctor Session
    const createHostBtn = screen.getByRole('button', { name: /Buat Sesi Dokter/i });
    fireEvent.click(createHostBtn);

    // Modal displays QR code and 6-digit PIN
    await waitFor(() => {
      expect(screen.getByText(/Kode PIN Sesi Pasien/i)).toBeInTheDocument();
    });

    // Close modal to see full Nurse View
    const closeBtn = screen.getByRole('button', { name: /Tampilkan Layar Petugas/i });
    fireEvent.click(closeBtn);

    // In Doctor Monitoring View: both Layar Petugas and Layar Pasien (mirror) are present
    expect(screen.getByText('Layar Petugas')).toBeInTheDocument();
    expect(screen.getByText('Layar Pasien')).toBeInTheDocument();

    // Header displays PIN button
    expect(screen.getByRole('button', { name: /PIN:/i })).toBeInTheDocument();
  });

  it('allows switching to Patient Mode by entering a 6-digit PIN', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Hubungkan HP Pasien/i }));

    const pinInput = screen.getByPlaceholderText(/Masukkan 6-digit PIN/i);
    const joinBtn = screen.getByRole('button', { name: /Masuk/i });

    // Try typing 6 digits
    fireEvent.change(pinInput, { target: { value: '123456' } });
    expect(joinBtn).not.toBeDisabled();

    fireEvent.click(joinBtn);

    // Now in dedicated Patient View: Layar Pasien is present, Layar Petugas is NOT
    await waitFor(() => {
      expect(screen.getByText('Layar Pasien')).toBeInTheDocument();
      expect(screen.queryByText('Layar Petugas')).not.toBeInTheDocument();
    });

    // Header has Keluar button
    expect(screen.getByRole('button', { name: /Keluar/i })).toBeInTheDocument();

    // Clicking Keluar returns to Standalone mode
    fireEvent.click(screen.getByRole('button', { name: /Keluar/i }));
    await waitFor(() => {
      expect(screen.getByText('Layar Petugas')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hubungkan HP Pasien/i })).toBeInTheDocument();
    });
  });

  it('automatically enters Patient Mode when room and role=patient are in URL parameters', () => {
    window.history.pushState({}, '', '/?room=987654&role=patient');

    render(<App />);

    expect(screen.getByText('Layar Pasien')).toBeInTheDocument();
    expect(screen.queryByText('Layar Petugas')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keluar/i })).toBeInTheDocument();
  });
});
