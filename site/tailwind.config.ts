import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{vue,ts}',
  ],
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          subtle: 'rgba(255, 255, 255, 0.04)',
        },
        background: '#0a0a1a',
        foreground: '#e0e0e0',
        card: { DEFAULT: '#111128', foreground: '#e0e0e0' },
        elevated: '#16213e',
        panel: {
          DEFAULT: '#101020',
          header: '#13132a',
        },
        primary: { DEFAULT: '#42b883', foreground: '#ffffff' },
        muted: { DEFAULT: '#16213e', foreground: '#9b9bb2' },
        destructive: { DEFAULT: '#e74c3c', foreground: '#ffffff' },
        accent: { DEFAULT: '#16213e', foreground: '#e0e0e0' },
        ring: '#42b883',
        dim: '#9b9bb2',
        subdued: '#8b8ba7',
        code: {
          key: '#8a7cc8',
          string: '#a6d189',
          number: '#ef9f76',
          bool: '#e78284',
          null: '#9498b8',
          tag: '#8888bb',
          link: '#81a1c1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
