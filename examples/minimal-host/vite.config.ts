import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A normal Vite + React app. Nothing crafted-design-specific is needed — the
// editor is just a component. `@crafted-design/editor` resolves from
// node_modules once you `npm install` it.
export default defineConfig({
  plugins: [react()],
})
