/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6', // Secondary Blue
          600: '#2563EB', // Primary Blue
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        navy: {
          800: '#1E293B',
          850: '#131D31',
          900: '#0B1120',
          950: '#070B14',
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(37, 99, 235, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 30px -5px rgba(37, 99, 235, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
        'luxury': '0 20px 40px -15px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(226, 232, 240, 0.85)',
        'glow-blue': '0 0 30px -5px rgba(37, 99, 235, 0.35)',
        'glow-cyan': '0 0 30px -5px rgba(6, 182, 212, 0.35)',
        'glow-rose': '0 0 30px -5px rgba(244, 63, 94, 0.35)',
      },
      keyframes: {
        pulseFast: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.05)' },
        },
        beacon: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
      animation: {
        'pulse-fast': 'pulseFast 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'beacon': 'beacon 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'radar': 'radarSweep 5s linear infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
