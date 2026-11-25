import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// 登录态接口不缓存（避免跨用户串缓存）
const PRIVATE_API_PREFIXES = ['/api/users/me', '/api/notifications', '/api/gyms/mine', '/api/gyms/pending']

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '健身地图 Gym Map',
        short_name: '健身地图',
        description: '健身房地图 · 器械清单 · 打卡与评价',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        lang: 'zh-CN',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => {
              if (request.method !== 'GET') return false
              if (!url.pathname.startsWith('/api/')) return false
              return !PRIVATE_API_PREFIXES.some((p) => url.pathname.startsWith(p))
            },
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
