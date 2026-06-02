import path from 'node:path'
// `vitest/config`'s defineConfig is a superset of vite's — it types the `test`
// field while staying a valid vite config (vite ignores `test`), so the app /
// dist builds that read this file are unaffected.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@design/sdk': path.resolve(__dirname, './src/sdk/index.ts'),
    },
  },
  test: {
    // Generate the Tailwind safelist before tests run — index.css @imports it.
    globalSetup: ['./vitest.globalSetup.ts'],
  },
})
