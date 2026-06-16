// Phase 20 — public demo entry (deployed at /try). A CLEAN editor: the
// production adapter set (shadcn + MUI + plain-HTML), no dogfood-only
// affordances (no chrome-theme toggle, no demo color variables, no
// placeholder-heavy example adapter) that live in the dev harness (App.tsx).
import { StrictMode, useState } from 'react'
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
import { EditorTemplateVariablesProvider } from './editor/variables/EditorTemplateVariablesProvider'
import type { EditorChromeTheme } from './editor/chromeTheme'

registerSystemFonts()
registerGoogleFonts()

// Phase 26 — showcase template variables: the inspector's `{{ }}` picker lists
// these and the canvas previews each `sample`.
const DEMO_TEMPLATE_VARIABLES = [
  { key: 'contact.name', label: 'Full name', group: 'Contact', sample: 'Jane Doe' },
  { key: 'contact.title', label: 'Job title', group: 'Contact', sample: 'Head of Product' },
  { key: 'company.name', label: 'Company', group: 'Company', sample: 'Acme Inc.' },
  { key: 'company.tagline', label: 'Tagline', group: 'Company', sample: 'Build better, faster.' },
]

// A host-level control that cycles the editor-chrome theme — showcases the
// `editorTheme` prop (1.1.0). Like in the dev harness (App.tsx), this lives
// OUTSIDE the editor toolbar: theming the chrome is host policy, not an
// end-user feature. 'brand' is a token map extending the dark preset.
function DemoApp() {
  const [choice, setChoice] = useState<'light' | 'dark' | 'brand'>('light')
  const next = { light: 'dark', dark: 'brand', brand: 'light' } as const
  const editorTheme: EditorChromeTheme =
    choice === 'brand'
      ? { preset: 'dark', accent: '#7aa2f7', accentFg: '#11131a' }
      : choice
  const label = choice === 'brand' ? 'brand (dark + accent)' : choice

  return (
    <ErrorBoundary fallback={TopShellErrorFallback}>
      <button
        type="button"
        onClick={() => setChoice((c) => next[c])}
        title="Cycle the editor-chrome theme (the editorTheme prop)"
        style={{
          position: 'fixed',
          right: 8,
          bottom: 8,
          zIndex: 100,
          padding: '4px 10px',
          fontSize: 12,
          borderRadius: 6,
          border: '1px solid #8884',
          // Opaque dark — a semi-transparent black (#0008) blends to ~#777 on a
          // light page, failing WCAG contrast with white text (axe: 4.47:1).
          background: '#111827',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        chrome: {label}
      </button>
      <EditorTemplateVariablesProvider variables={DEMO_TEMPLATE_VARIABLES}>
        <Editor editorTheme={editorTheme} />
      </EditorTemplateVariablesProvider>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>,
)
