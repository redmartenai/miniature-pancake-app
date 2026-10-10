/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// The backend sends no CORS headers (backend docs/security/authentication.md): the API must be
// same-origin with the web app. In development Vite proxies /api to the backend; in production a
// reverse proxy does the same.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:8000'
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      // changeOrigin: the backend's ALLOWED_HOSTS knows its own host, not a phone-facing LAN address.
      proxy: { '/api': { target, changeOrigin: true } },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // Forked workers time out starting on slower Windows machines; threads start reliably.
      pool: 'threads',
      testTimeout: 20_000,
    },
  }
})
