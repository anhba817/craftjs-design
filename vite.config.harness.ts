import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Phase 22 — build the screenshot render harness (harness.html →
// src/renderer/harness.tsx) into dist-lib/harness/ so it SHIPS with the
// package (the MCP `render_image` tool loads it via file://). `base: './'`
// makes the built page loadable from a file:// URL. A normal app build —
// React + the shadcn/html adapters + the stylesheet are bundled (the price
// of an in-browser, real-design-system render). Built after build:dist (which
// empties dist-lib); its own emptyOutDir only clears dist-lib/harness.
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
    outDir: 'dist-lib/harness',
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(__dirname, 'harness.html') },
  },
})
