import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE ?? '/',
  resolve: {
    dedupe: ['react', 'react-dom', 'framer-motion', 'react-router-dom'],
  },
  server: {
    fs: { allow: ['..', '../..'] },
  },
})
