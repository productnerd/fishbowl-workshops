import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE ?? '/fishbowl/throughtheireyes/',
  resolve: {
    // Single copy of these across the monorepo (hooks / MotionContext / router context).
    dedupe: ['react', 'react-dom', 'framer-motion', 'react-router-dom'],
  },
  server: {
    // Allow dev server to serve the symlinked workspace package sources.
    fs: { allow: ['..', '../..'] },
  },
})
