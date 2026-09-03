import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('./live', import.meta.url)),
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: fileURLToPath(new URL('./dist-live', import.meta.url)),
    emptyOutDir: true,
  },
})
