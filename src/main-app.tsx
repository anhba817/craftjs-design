// Phase 8 dist entry point. Integration consumers (`npm install @design/editor`
// and `import { Editor } from '@design/editor'`) load this module; it runs
// all the side-effect imports that register canonicals / adapters / themes /
// inspector panels / templates, then re-exports the editor's runtime surface
// plus the full SDK.
//
// Consumers who want to customize the registry (suppress a canonical, replace
// an adapter, ship a custom theme) can call the SDK functions BEFORE rendering
// <Editor /> — for example:
//
//   import { Editor, unregisterCanonical, registerAdapter } from '@design/editor'
//   unregisterCanonical('alert')
//   registerAdapter({ id: 'mylib', displayName: 'MyLib', components: {...} })
//
//   function Host() {
//     return <Editor />
//   }
//
// The order matters: registrations must happen synchronously before the first
// render. The example above does both at module top level for simplicity;
// React hosts can also register inside `useEffect(() => {...}, [])` with the
// caveat that the editor mounts first with the default set and refreshes when
// the hot-reload path kicks in (Phase 7's registryVersion subscription).

// Tailwind CSS + theme + safelist — Vite bundles this into dist-lib/index.css
// for hosts to import. Without this import the dist would ship without any
// styling, leaving the editor un-themed in the host app.
import './index.css'

// Side-effect imports — same set as src/App.tsx. Pre-registers all built-ins.
import './registry/components'
import './adapters/shadcn'
import './adapters/mui'
import './themes'
import './editor/inspector/built-in-panels'
import './persistence/templates'

// Editor runtime surface.
export { Editor, ErrorBoundary, TopShellErrorFallback } from './editor/Editor'
export type { ErrorFallbackProps } from './editor/errors/ErrorBoundary'

// Full SDK — re-exported so consumers don't need a separate @design/sdk
// import path.
export * from './sdk'

// State management surface for hosts that need to drive the editor
// programmatically (open documents, switch theme, etc.).
export { useEditorStore } from './state/editorStore'
export type { Breakpoint } from './state/editorStore'
export { useDocumentStore } from './persistence/documentStore'
export type { EditorDocument } from './persistence/schema'

// Document import/export helpers — integration hosts that want to persist
// documents to their own backend bypass useDocumentStore and use these
// directly.
export {
  exportDocument,
  downloadDocument,
} from './persistence/exportDocument'
export {
  importDocumentFromFile,
  parseDocumentJson,
  ImportError,
} from './persistence/importDocument'
