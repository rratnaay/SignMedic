import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { TriageProvider } from '../state/triageContext';
import { NurseView } from '../components/NurseView';
import { PatientView } from '../components/PatientView';

// Mock MockSpeechRecognition
class MockSpeechRecognition {
  lang: string = '';
  interimResults: boolean = false;
  continuous: boolean = false;

  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  start() {
    if (this.onstart) {
      this.onstart();
    }
  }

  stop() {
    if (this.onend) {
      this.onend();
    }
  }

  abort() {
    if (this.onend) {
      this.onend();
    }
  }

  // Helper method for tests to simulate incoming speech transcript
  simulateSpeech(text: string, isFinal: boolean = true) {
    if (this.onresult) {
      this.onresult({
        resultIndex: 0,
        results: [
          {
            0: { transcript: text },
            isFinal,
            length: 1,
          },
        ],
      });
    }
  }

  // Helper method for tests to simulate microphone error
  simulateError(errorType: string) {
    if (this.onerror) {
      this.onerror({ error: errorType });
    }
  }
}

describe('FASE 4: Speech-to-Text (Web Speech API id-ID) in NurseView', () => {
  let originalSpeechRecognition: any;
  let originalWebkitSpeechRecognition: any;
  let latestInstance: MockSpeechRecognition | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalSpeechRecognition = (window as any).SpeechRecognition;
    originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;

    latestInstance = null;
    const MockClass = function () {
      latestInstance = new MockSpeechRecognition();
      return latestInstance;
    } as any;

    (window as any).SpeechRecognition = MockClass;
    (window as any).webkitSpeechRecognition = MockClass;
  });

  afterEach(() => {
    (window as any).SpeechRecognition = originalSpeechRecognition;
    (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  it('renders microphone button with accessible label and configuration for id-ID', () => {
    render(
      <TriageProvider>
        <NurseView />
      </TriageProvider>
    );

    const micButton = screen.getByRole('button', {
      name: /Ucapkan pesan menggunakan mikrofon/i,
    });
    expect(micButton).toBeInTheDocument();
    expect(micButton).not.toBeDisabled();
    expect(micButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('activates listening state and shows "Mendengarkan" label when mic button is clicked', () => {
    render(
      <TriageProvider>
        <NurseView />
      </TriageProvider>
    );

    const micButton = screen.getByRole('button', {
      name: /Ucapkan pesan menggunakan mikrofon/i,
    });

    fireEvent.click(micButton);

    expect(latestInstance).not.toBeNull();
    expect(latestInstance?.lang).toBe('id-ID');
    expect(screen.getByText('Mendengarkan')).toBeInTheDocument();
    expect(micButton).toHaveAttribute('aria-pressed', 'true');
    expect(micButton).toHaveAttribute(
      'aria-label',
      'Sedang mendengarkan... Klik untuk berhenti'
    );
  });

  it('captures spoken speech in id-ID, fills input field, and allows sending message to patient view', () => {
    render(
      <TriageProvider>
        <PatientView />
        <NurseView />
      </TriageProvider>
    );

    const micButton = screen.getByRole('button', {
      name: /Ucapkan pesan menggunakan mikrofon/i,
    });
    fireEvent.click(micButton);

    // Simulate speech from nurse
    act(() => {
      latestInstance?.simulateSpeech('Mohon tunggu di ruang pemeriksaan 2', true);
    });

    const nurseInput = screen.getByPlaceholderText(
      /Tulis pesan atau instruksi untuk pasien\.\.\./i
    ) as HTMLInputElement;

    expect(nurseInput.value).toBe('Mohon tunggu di ruang pemeriksaan 2');

    // Nurse sends the message
    const sendButton = screen.getByRole('button', { name: /^Kirim Pesan$/i });
    fireEvent.click(sendButton);

    // Input resets and message appears in Patient view's "Pesan dari Petugas"
    expect(nurseInput.value).toBe('');
    expect(
      screen.getByText('Mohon tunggu di ruang pemeriksaan 2')
    ).toBeInTheDocument();
  });

  it('smoothly appends speech to pre-typed text', () => {
    render(
      <TriageProvider>
        <NurseView />
      </TriageProvider>
    );

    const nurseInput = screen.getByPlaceholderText(
      /Tulis pesan atau instruksi untuk pasien\.\.\./i
    ) as HTMLInputElement;

    // Nurse typed initial text
    fireEvent.change(nurseInput, { target: { value: 'Halo Ibu,' } });

    const micButton = screen.getByRole('button', {
      name: /Ucapkan pesan menggunakan mikrofon/i,
    });
    fireEvent.click(micButton);

    // Speech arrives
    act(() => {
      latestInstance?.simulateSpeech('apakah ada alergi paracetamol?', true);
    });

    expect(nurseInput.value).toBe('Halo Ibu, apakah ada alergi paracetamol?');
  });

  it('handles unsupported browser gracefully and displays required notice (DESIGN.md Section 9)', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    render(
      <TriageProvider>
        <NurseView />
      </TriageProvider>
    );

    // Notice per DESIGN.md Section 9
    expect(
      screen.getByText(
        'Speech-to-Text tidak tersedia di browser ini. Gunakan pertanyaan cepat atau ketik manual.'
      )
    ).toBeInTheDocument();

    const micButton = screen.getByRole('button', {
      name: /Speech-to-Text tidak didukung/i,
    });
    expect(micButton).toBeDisabled();
  });

  it('handles microphone permission denial or errors with polite clinical alert (DESIGN.md Section 9)', () => {
    render(
      <TriageProvider>
        <NurseView />
      </TriageProvider>
    );

    const micButton = screen.getByRole('button', {
      name: /Ucapkan pesan menggunakan mikrofon/i,
    });
    fireEvent.click(micButton);

    // Simulate microphone permission denied
    act(() => {
      latestInstance?.simulateError('not-allowed');
    });

    // Error message per DESIGN.md Section 9
    expect(
      screen.getByText(
        'Mikrofon tidak bisa dipakai. Ketik pesan atau pilih pertanyaan cepat.'
      )
    ).toBeInTheDocument();

    // Typing manually dismisses the error
    const nurseInput = screen.getByPlaceholderText(
      /Tulis pesan atau instruksi untuk pasien\.\.\./i
    );
    fireEvent.change(nurseInput, { target: { value: 'Ketik manual...' } });

    expect(
      screen.queryByText(
        'Mikrofon tidak bisa dipakai. Ketik pesan atau pilih pertanyaan cepat.'
      )
    ).not.toBeInTheDocument();
  });

  it('integrates full speech flow in dual-screen App without data persistence', () => {
    render(<App />);

    const micButton = screen.getByRole('button', {
      name: /Ucapkan pesan menggunakan mikrofon/i,
    });
    fireEvent.click(micButton);

    act(() => {
      latestInstance?.simulateSpeech('Silakan istirahat sebentar di ranjang 1', true);
    });

    const sendButton = screen.getByRole('button', { name: /^Kirim Pesan$/i });
    fireEvent.click(sendButton);

    // The message is displayed in Patient View
    expect(
      screen.getByText('Silakan istirahat sebentar di ranjang 1')
    ).toBeInTheDocument();

    // Verify Zero persistence principle (no localStorage or sessionStorage)
    expect(localStorage.getItem('signmedic_messages')).toBeNull();
    expect(sessionStorage.getItem('signmedic_messages')).toBeNull();
  });
});
