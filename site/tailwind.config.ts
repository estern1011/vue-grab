import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{vue,ts}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'rgba(255, 255, 255, 0.06)',
        background: '#0a0a1a',
        foreground: '#e0e0e0',
        card: { DEFAULT: '#111128', foreground: '#e0e0e0' },
        primary: { DEFAULT: '#42b883', foreground: '#ffffff' },
        muted: { DEFAULT: '#16213e', foreground: '#888888' },
        destructive: { DEFAULT: '#e74c3c', foreground: '#ffffff' },
        accent: { DEFAULT: '#16213e', foreground: '#e0e0e0' },
        ring: '#42b883',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
