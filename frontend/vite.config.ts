import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const backend = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: resolve(import.meta.dirname, '..'),
  server: {
    proxy: {
      '/api/v1': backend,
    },
  },
  test: { environment: 'jsdom' },
})
