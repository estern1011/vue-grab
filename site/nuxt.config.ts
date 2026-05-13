export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,

  // Keep Vue devtools hook enabled in production so Vue Grab can detect components
  vue: {
    compilerOptions: {},
  },

  vite: {
    define: {
      __VUE_PROD_DEVTOOLS__: true,
    },
  },

  app: {
    head: {
      title: 'Vue Grab - Select context for AI coding agents from your Vue app',
      meta: [
        { name: 'description', content: 'Click any Vue component to extract its context for Claude Code, Cursor, and other AI coding assistants.' },
        { name: 'theme-color', content: '#0a0a1a' },
        { property: 'og:title', content: 'Vue Grab' },
        { property: 'og:description', content: 'Select context for AI coding agents directly from your Vue app' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap', rel: 'stylesheet' },
      ],
    },
  },

  css: ['~/assets/main.css'],
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt', '@pinia/nuxt', '@vercel/analytics'],
  tailwindcss: {
    config: {
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
            panel: { DEFAULT: '#101020', header: '#13132a' },
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
    },
  },
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
})