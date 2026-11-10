import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // No GitHub Pages o site fica em /<repositório>/ (o workflow define BASE_PATH)
  base: process.env.BASE_PATH ?? '/',
  server: {
    // raw/ guarda os arquivos-fonte pesados (Z-Anatomy .blend/.zip); não observar
    watch: { ignored: ['**/raw/**'] },
  },
})
