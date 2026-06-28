import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/tax-bf.ts'],
      reporter: ['text', 'html'],
    },
  },
  build: {
    sourcemap: true,
  },
  plugins: [react(), sentryVitePlugin({
    org: process.env.VITE_SENTRY_ORG,
    project: process.env.VITE_SENTRY_PROJECT,
    authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
    telemetry: false,
  }), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'Billio — Invoicing',
      short_name: 'Billio',
      description: 'Professional invoicing for West African SMBs — create, send and track invoices with Mobile Money support.',
      theme_color: '#185FA5',
      background_color: '#EAEEF3',
      display: 'standalone',
      orientation: 'portrait-primary',
      categories: ['finance', 'business', 'productivity'],
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      navigateFallback: 'index.html',
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})