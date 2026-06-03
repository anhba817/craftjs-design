import './registry/components'
import './adapters/shadcn'
import './adapters/mui'
import './adapters/html'
import '../examples/adapter-chakra'
import './themes'
import './editor/inspector/built-in-panels'
import './persistence/templates'
import { EditorColorVariablesProvider } from './editor/colors/EditorColorVariablesProvider'
import { Editor, ErrorBoundary, TopShellErrorFallback } from './editor/Editor'
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
  return (
    <ErrorBoundary fallback={TopShellErrorFallback}>
      <EditorColorVariablesProvider variables={DEMO_COLOR_VARIABLES}>
        <Editor editorTheme="dark" />
      </EditorColorVariablesProvider>
    </ErrorBoundary>
  )
}
