// Phase 20 — public demo entry (deployed at /try). A CLEAN editor: the
// production adapter set (shadcn + MUI + plain-HTML), no dogfood-only
// affordances (no chrome-theme toggle, no demo color variables, no
// placeholder-heavy example adapter) that live in the dev harness (App.tsx).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Register the production canonicals, adapters, themes, panels, templates.
import './registry/components'
import './adapters/shadcn'
import './adapters/mui'
import './adapters/html'
import './themes'
import './editor/inspector/built-in-panels'
import './persistence/templates'

import {
  registerGoogleFonts,
  registerSystemFonts,
} from './registry/curated-fonts'
import { Editor, ErrorBoundary, TopShellErrorFallback } from './editor/Editor'

registerSystemFonts()
registerGoogleFonts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={TopShellErrorFallback}>
      <Editor />
    </ErrorBoundary>
  </StrictMode>,
)
