import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { lossless: true },
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/ws-booking': {
        target: 'http://localhost:8081',
        ws: true,
      },
    },
  },
  define: {
    global: 'window',
  },
  build: {
    rollupOptions: {
      output: {}
    }
  }
})
