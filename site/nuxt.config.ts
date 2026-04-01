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
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt', '@pinia/nuxt'],
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
})