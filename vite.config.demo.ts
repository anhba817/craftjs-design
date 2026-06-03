import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Phase 20 — build the public /try demo (demo.html → src/demo.tsx) into
// dist-demo/. `base: './'` makes asset URLs relative so it can be hosted under
// any subpath (Pages serves it at /<repo>/try/). Unlike the library dist build
// (vite.config.dist.ts), this is a normal app build — React etc. are bundled.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@design/sdk': path.resolve(__dirname, './src/sdk/index.ts'),
    },
  },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'demo.html'),
    },
  },
})
