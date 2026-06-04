// Phase 21 — `@crafted-design/editor/renderer`: display saved documents on
// production pages WITHOUT the editor. Registers the canonicals + themes the
// documents reference; the host registers an ADAPTER (its design system) and
// imports the stylesheet, exactly like embedding the editor:
//
//   import { DocumentRenderer } from '@crafted-design/editor/renderer'
//   import '@crafted-design/editor/adapters/shadcn'
//   import '@crafted-design/editor/index.css'
//
//   <DocumentRenderer document={savedEnvelope} />
//
// Deliberately NOT exported from the editor entries: importing this pulls the
// canonical registry + Craft's render path, but none of the editor chrome.
import '@/registry/components'
import '@/themes'

export {
  DocumentRenderer,
  type DocumentRendererProps,
} from './DocumentRenderer'
export type { EditorDocument } from '@/persistence/schema'
