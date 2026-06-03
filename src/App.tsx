import './registry/components'
import './adapters/shadcn'
import './adapters/mui'
import './adapters/html'
import '../examples/adapter-chakra'
import './themes'
import './editor/inspector/built-in-panels'
import './persistence/templates'
import { useState } from 'react'
import { EditorColorVariablesProvider } from './editor/colors/EditorColorVariablesProvider'
import { Editor, ErrorBoundary, TopShellErrorFallback } from './editor/Editor'
import type { EditorChromeTheme } from './editor/chromeTheme'
import {
  registerGoogleFonts,
  registerSystemFonts,
} from './registry/curated-fonts'

// Phase 12 § 4.15 — offer popular fonts out of the box (selectable in the
// Typography → Font dropdown without uploading). System stacks cost nothing;
// the Google set loads one combined stylesheet from Google's CDN.
registerSystemFonts()
registerGoogleFonts()

// Phase 12 § 4.9 demo — example host CSS variables (defined in index.css).
// Hosts pass their own design tokens here; the ColorPicker surfaces them as
// a "Design variables" swatch row.
const DEMO_COLOR_VARIABLES = [
  { name: 'brand-blue', label: 'Brand Blue' },
  { name: 'brand-ink', label: 'Brand Ink' },
  { name: 'brand-sand', label: 'Brand Sand' },
]

export default function App() {
  // Phase 8 — top-shell error boundary. Catches anything that bubbles out of
  // <Editor /> itself (resolver build failure, AdapterProvider exception,
  // unhandled hydration crash). Inner boundaries inside <Editor /> handle
  // localized failures so this one only fires for genuinely catastrophic
  // errors.
  // Phase 19 — dogfood the host-level editorTheme control. This is a HOST
  // affordance (a button the integrating app owns), NOT an end-user editor
  // feature: like the adapter pin, the chrome theme is host policy, so it
  // deliberately lives outside <Editor />'s own toolbar.
  const [chromeChoice, setChromeChoice] = useState<
    'light' | 'dark' | 'brand'
  >('light')
  const nextChoice = { light: 'dark', dark: 'brand', brand: 'light' } as const
  // 'brand' = a partial token map extending the dark preset — proves brand
  // overrides layer on a built-in preset.
  const themeForEditor: EditorChromeTheme =
    chromeChoice === 'brand'
      ? { preset: 'dark', accent: '#7aa2f7', accentFg: '#11131a' }
      : chromeChoice
  const label =
    chromeChoice === 'brand' ? 'brand (dark + accent)' : chromeChoice

  return (
    <ErrorBoundary fallback={TopShellErrorFallback}>
      <EditorColorVariablesProvider variables={DEMO_COLOR_VARIABLES}>
        <button
          type="button"
          onClick={() => setChromeChoice((c) => nextChoice[c])}
          style={{
            position: 'fixed',
            right: 8,
            bottom: 8,
            zIndex: 100,
            padding: '4px 10px',
            fontSize: 12,
            borderRadius: 6,
            border: '1px solid #8884',
            background: '#0008',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          chrome: {label}
        </button>
        <Editor editorTheme={themeForEditor} />
      </EditorColorVariablesProvider>
    </ErrorBoundary>
  )
}
