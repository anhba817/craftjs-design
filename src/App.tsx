import './registry/components'
import './adapters/shadcn'
import './adapters/mui'
import '../examples/adapter-chakra'
import './themes'
import './editor/inspector/built-in-panels'
import './persistence/templates'
import { Editor, ErrorBoundary, TopShellErrorFallback } from './editor/Editor'

export default function App() {
  // Phase 8 — top-shell error boundary. Catches anything that bubbles out of
  // <Editor /> itself (resolver build failure, AdapterProvider exception,
  // unhandled hydration crash). Inner boundaries inside <Editor /> handle
  // localized failures so this one only fires for genuinely catastrophic
  // errors.
  return (
    <ErrorBoundary fallback={TopShellErrorFallback}>
      <Editor />
    </ErrorBoundary>
  )
}
