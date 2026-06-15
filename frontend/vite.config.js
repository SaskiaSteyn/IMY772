import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'microtrack-logo.png'],
      manifest: {
        name: 'Microtrack',
        short_name: 'Microtrack',
        description: 'Track and manage your microgreens',
        theme_color: '#7db344',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/microtrack-app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/microtrack-app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // NOTE: /api/* is intentionally NOT cached by the service worker.
          // It is live dashboard data; caching it (previously NetworkFirst, 24h)
          // served stale data and, on any blip, surfaced a false "server is
          // waking up" state. API requests now always go straight to the network.
        ],
      },
    }),
  ],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
})
