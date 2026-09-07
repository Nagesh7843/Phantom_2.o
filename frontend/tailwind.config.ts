import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        mono: {
          950: '#000000',
          900: '#0a0a0c',
          850: '#111114',
          800: '#18181b',
          700: '#27272a',
          600: '#3f3f46',
          500: '#52525b',
          400: '#71717a',
          300: '#a1a1aa',
          200: '#d4d4d8',
          100: '#f4f4f5',
          50: '#fafafa',
          white: '#ffffff',
        },
        cyber: {
          dark: '#000000',
          card: '#0a0a0c',
          panel: '#111114',
          border: '#27272a',
          accent: '#ffffff',
          glow: '#ffffff',
          neon: '#ffffff',
          purple: '#d4d4d8',
          pink: '#a1a1aa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'mono-glow': '0 0 20px -2px rgba(255, 255, 255, 0.25)',
        'mono-subtle': '0 0 15px -3px rgba(255, 255, 255, 0.1)',
        'mono-card': '0 4px 20px 0 rgba(0, 0, 0, 0.7)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
        'glow-teal': '0 0 20px -2px rgba(255, 255, 255, 0.2)',
        'glow-cyan': '0 0 20px -2px rgba(255, 255, 255, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

