import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TriageProvider } from '../state/triageContext';
import { PatientView } from '../components/PatientView';
import { CameraGesturePanel } from '../components/CameraGesturePanel';
import modelMeta from '../../public/models/model_meta.json';
import weights from '../../public/models/weights.json';

// Mock MediaPipe tasks-vision
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  HandLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn().mockReturnValue({ landmarks: [] }),
      close: vi.fn(),
    }),
  },
}));

describe('SignMedic Camera & Gesture UI Flow Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock fetch for model files in jsdom test environment
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('model_meta.json')) {
        return {
          ok: true,
          json: async () => modelMeta,
        } as Response;
      }
      if (urlStr.includes('weights.json')) {
        return {
          ok: true,
          json: async () => weights,
        } as Response;
      }
      return {
        ok: false,
        status: 404,
      } as Response;
    });
  });

  it('renders tab Gestur Kamera and requires explicit user action before requesting camera stream', async () => {
    const getUserMediaMock = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      configurable: true,
      writable: true,
    });

    render(
      <TriageProvider>
        <PatientView />
      </TriageProvider>
    );

    // Switch to Gestur Kamera tab
    const cameraTab = screen.getByRole('tab', { name: /Gestur Kamera/i });
    fireEvent.click(cameraTab);

    // Wait for model loading to finish
    await waitFor(() => {
      expect(screen.getByText('Kamera belum aktif.')).toBeInTheDocument();
    });

    // Verify getUserMedia was NOT called automatically
    expect(getUserMediaMock).not.toHaveBeenCalled();

    // Verify supported gestures vocabulary is displayed including new triage symptoms
    expect(screen.getByText(/Kosakata Gestur yang Didukung/i)).toBeInTheDocument();
    expect(screen.getAllByText('Air')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Makan')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Batuk')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Demam')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Pilek')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Sesak Nafas')[0]).toBeInTheDocument();

    // Now click the explicit activation button
    const activateBtn = screen.getByRole('button', { name: /Aktifkan kamera/i });
    fireEvent.click(activateBtn);

    // Now getUserMedia should have been invoked
    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
  });

  it('shows graceful fallback when camera permission is denied', async () => {
    const getUserMediaErrorMock = vi.fn().mockRejectedValue(new Error('Permission denied'));

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaErrorMock },
      configurable: true,
      writable: true,
    });

    const onSwitchMock = vi.fn();

    render(
      <TriageProvider>
        <CameraGesturePanel onSwitchToBoard={onSwitchMock} />
      </TriageProvider>
    );

    // Wait until model is ready and "Kamera belum aktif." appears
    await waitFor(() => {
      expect(screen.getByText('Kamera belum aktif.')).toBeInTheDocument();
    });

    // Click activate camera
    const activateBtn = screen.getByRole('button', { name: /Aktifkan kamera/i });
    fireEvent.click(activateBtn);

    // Should transition to denied state
    await waitFor(() => {
      expect(
        screen.getByText('Kamera tidak bisa dipakai. Papan Visual tetap bisa digunakan.')
      ).toBeInTheDocument();
    });

    // Click "Buka Papan Visual" fallback button
    const fallbackBtn = screen.getByRole('button', { name: /Buka Papan Visual/i });
    fireEvent.click(fallbackBtn);
    expect(onSwitchMock).toHaveBeenCalledTimes(1);
  });

  it('never displays confidence percentage in the UI per DESIGN.md R-17', async () => {
    render(
      <TriageProvider>
        <PatientView />
      </TriageProvider>
    );

    const cameraTab = screen.getByRole('tab', { name: /Gestur Kamera/i });
    fireEvent.click(cameraTab);

    // Check that no percentage signs exist in candidate or status displays
    const panel = screen.getByRole('tabpanel');
    expect(panel.textContent).not.toMatch(/\d+%/);
    expect(panel.textContent).not.toMatch(/confidence/i);
    expect(panel.textContent).not.toMatch(/keyakinan \d+/i);
  });
});
