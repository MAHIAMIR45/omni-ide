/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'omni': {
          bg: '#0a0e1a',
          surface: '#0f1525',
          panel: '#111827',
          border: '#1e2d45',
          accent: '#00d4ff',
          accentDark: '#0098b8',
          green: '#00ff88',
          red: '#ff4757',
          yellow: '#ffd32a',
          purple: '#7c3aed',
          text: '#e2e8f0',
          muted: '#64748b',
          dim: '#334155',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00d4ff, 0 0 10px #00d4ff' },
          '100%': { boxShadow: '0 0 15px #00d4ff, 0 0 30px #00d4ff, 0 0 45px #00d4ff' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(circle at 1px 1px, rgba(0, 212, 255, 0.05) 1px, transparent 0)',
        'omni-gradient': 'linear-gradient(135deg, #0a0e1a 0%, #0f1525 50%, #0a0e1a 100%)',
      },
    },
  },
  plugins: [],
};
