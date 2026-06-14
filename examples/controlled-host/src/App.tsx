// Phase 23 — embedding <Editor> as a CONTROLLED component.
//
// The host owns the document in its own state and drives the editor through
// the standard controlled contract:
//   - `value`         — the document the editor renders (single source of truth)
//   - `onChange`      — fired (debounced) on every edit, with the new envelope
//   - `persistence={false}` — the editor never touches its own IndexedDB store
//   - `hideChrome`    — no built-in Save/Load bar; the host renders its own UI
//   - `ref`           — read/replace the document imperatively on demand
//
// No iframe, no postMessage, no custom StorageAdapter, no DOM-clicking a Save
// button — the workarounds a controlled component makes unnecessary.
import { useCallback, useRef, useState } from 'react'
import { Editor, type EditorHandle } from '@crafted-design/editor/core'
import type { EditorDocument } from '@crafted-design/editor/core'
import { DocumentRenderer } from '@crafted-design/editor/renderer'
import { buildDocument } from '@crafted-design/editor/headless'
// Register the design system the editor + renderer use (side-effect import).
import '@crafted-design/editor/adapters/shadcn'
// The SCOPED stylesheet (Phase 24): every rule is prefixed with
// `.crafted-design-scope`, so the editor can be embedded INLINE in an app
// already running Tailwind v4 with no double preflight and no token clobbering
// — no iframe needed. (A non-Tailwind / standalone host can use the global
// `@crafted-design/editor/index.css` instead.)
import '@crafted-design/editor/index.scoped.css'

// A document the host "loaded from its backend". Built headlessly (no editor
// needed) — exactly what a server or a previous session would hand you.
const SEED: EditorDocument = buildDocument({
  root: {
    canonical: 'box',
    style: { classes: { root: 'p-8 flex flex-col gap-4 bg-background' } },
    children: [
      { canonical: 'heading', nodeProps: { content: 'Edit me' } },
      {
        canonical: 'text',
        nodeProps: { content: 'This <Editor> is a controlled component.' },
      },
      { canonical: 'button', nodeProps: { label: 'Call to action' } },
    ],
  },
  adapterId: 'shadcn',
})

const panel: React.CSSProperties = { minWidth: 0, overflow: 'auto' }

export default function App() {
  // The host owns the document. The editor is controlled by `doc`.
  const [doc, setDoc] = useState<EditorDocument>(SEED)
  const editorRef = useRef<EditorHandle>(null)

  // onChange round-trips through host state → back into `value`. The editor
  // dedupes the echo internally, so this does NOT loop.
  const onChange = useCallback((next: EditorDocument) => setDoc(next), [])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        height: '100vh',
      }}
    >
      {/* The embedded editor — chromeless, controlled, no persistence. */}
      <section style={{ ...panel, borderRight: '1px solid #e5e7eb' }}>
        <Editor
          ref={editorRef}
          adapter="shadcn"
          value={doc}
          onChange={onChange}
          persistence={false}
          hideChrome
        />
      </section>

      {/* The host's own UI: a live preview + the serialized JSON it would
          persist, plus buttons that exercise the imperative ref. */}
      <section style={{ ...panel, padding: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => {
              const current = editorRef.current?.getDocument()
              if (current) setDoc(current)
            }}
          >
            Read via ref
          </button>
          <button type="button" onClick={() => editorRef.current?.setDocument(SEED)}>
            Reset via ref
          </button>
          <button type="button" onClick={() => setDoc(SEED)}>
            Re-seed via value
          </button>
        </div>

        <h2 style={{ font: '600 14px system-ui', margin: '0 0 8px' }}>
          Live preview (DocumentRenderer)
        </h2>
        <DocumentRenderer document={doc} />

        <h2 style={{ font: '600 14px system-ui', margin: '24px 0 8px' }}>
          Serialized document (what you'd save)
        </h2>
        <pre
          style={{
            fontSize: 11,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: '#f8fafc',
            padding: 12,
            borderRadius: 6,
          }}
        >
          {JSON.stringify(doc, null, 2)}
        </pre>
      </section>
    </div>
  )
}
