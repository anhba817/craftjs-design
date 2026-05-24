import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Phase 8 dist build configuration. Used by `npm run build:dist` to produce
// an embeddable bundle for integration consumers.
//
// Externals: React + React DOM + @craftjs/core are marked as peer dependencies
// — the host React app provides them. Bundling them would risk the
// "two copies of React" hook-call error.
//
// Output: dist-lib/index.js (ES module) + dist-lib/index.css (Tailwind CSS).
// TypeScript declarations are emitted by `tsc --emitDeclarationOnly` in a
// follow-up step; Phase 9 polish can add vite-plugin-dts for an integrated
// build.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@design/sdk': path.resolve(__dirname, './src/sdk/index.ts'),
    },
  },
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/main-app.tsx'),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'index',
    },
    rollupOptions: {
      // React + ReactDOM + Craft are peer dependencies — the integration host
      // supplies them. Without externalization, the dist ships its own copies
      // and React throws "Invalid hook call" at runtime due to two parallel
      // React instances seeing the same Hooks dispatcher.
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client',
        '@craftjs/core',
      ],
    },
    // Don't minify by default — easier to debug post-install. Hosts that want
    // a minified copy can run their own bundler over our dist (esbuild,
    // Rollup, Webpack, etc.).
    minify: false,
    sourcemap: true,
  },
})
