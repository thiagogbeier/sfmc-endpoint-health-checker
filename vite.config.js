import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/sfmc-endpoint-health-checker/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})