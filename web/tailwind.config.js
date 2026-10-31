/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        soft: 'var(--soft)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        brand: 'var(--brand)',
        'brand-ink': 'var(--brand-ink)',
        tint: 'var(--tint)',
        line: 'var(--line)',
        edge: 'var(--edge)',
        blue: 'var(--blue)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'ok-bg': 'var(--ok-bg)',
        'ok-text': 'var(--ok-text)',
        err: 'var(--err)',
        'err-bg': 'var(--err-bg)',
        'err-ink': 'var(--err-ink)',
      },
      borderRadius: {
        badge: '8px',
        control: '12px',
        tile: '14px',
        bubble: '14px',
        card: '16px',
        panel: '18px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 4px 20px -2px rgba(20, 44, 88, 0.08), 0 2px 6px -1px rgba(20, 44, 88, 0.04)',
        card: '0 1px 3px 0 rgba(20, 44, 88, 0.06), 0 1px 2px -1px rgba(20, 44, 88, 0.06)',
      },
    },
  },
  plugins: [],
};
