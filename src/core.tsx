// Phase 16 § 8.3 — the lean editor entry: `@crafted-design/editor/core`.
//
// Registers the editor + the **shadcn** and **html** adapters + themes /
// panels / templates / canonicals — but NOT MUI or Chakra, so a host that
// only uses shadcn (or plain HTML) carries none of their weight and needs
// none of their (optional peer) dependencies installed.
//
// Opt into more adapters by importing their subpath BEFORE rendering
// <Editor /> (registration is a module side effect):
//
//   import '@crafted-design/editor/core'
//   import '@crafted-design/editor/adapters/mui'   // now MUI is in the switcher
//
// The batteries-included `@crafted-design/editor` entry (main-app.tsx) is
// just this module plus the MUI adapter pre-registered.
//
// This module owns the full public export surface; main-app re-exports it.

// Tailwind CSS + theme + safelist — bundled into the entry's CSS.
import './index.css'

// Side-effect registrations (NO MUI / Chakra here).
import './registry/components'
import './adapters/shadcn'
import './adapters/html'
import './themes'
import './editor/inspector/built-in-panels'
import './persistence/templates'

// Editor runtime surface.
export { Editor, ErrorBoundary, TopShellErrorFallback } from './editor/Editor'
export type { EditorProps } from './editor/Editor'
export type {
  EditorChromeTheme,
  EditorChromeTokens,
} from './editor/chromeTheme'
export type { ErrorFallbackProps } from './editor/errors/ErrorBoundary'

// Full SDK — re-exported so consumers don't need a separate
// @crafted-design/editor/sdk import path.
export * from './sdk'

// State management surface for hosts driving the editor programmatically.
export { useEditorStore } from './state/editorStore'
export type { Breakpoint } from './state/editorStore'
export { useDocumentStore } from './persistence/documentStore'
export type { EditorDocument } from './persistence/schema'

// Document import/export helpers.
export {
  exportDocument,
  downloadDocument,
} from './persistence/exportDocument'
export {
  importDocumentFromFile,
  parseDocumentJson,
  ImportError,
} from './persistence/importDocument'
