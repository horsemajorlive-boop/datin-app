import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
//
// В разработке фронтенд (:5173) и API (:3001) — на разных портах.
// Чтобы браузер общался с сервером как со «своим» (без CORS и проблем
// с ws://), просим Vite проксировать эти пути на бэкенд.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
