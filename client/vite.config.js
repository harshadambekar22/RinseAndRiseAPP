import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies /api to the .NET backend so the frontend can call
// relative URLs and avoid CORS during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true
      }
    }
  }
})
