// Phase 23 + 26 — embedding <Editor> as a CONTROLLED component WITH template
// variables.
//
// Controlled contract (Phase 23):
//   - `value` / `onChange` — the host owns the document
//   - `persistence={false}` — no built-in IndexedDB store
//   - `hideChrome`          — the host renders its own save/load UI
//   - `ref`                 — read/replace the document imperatively
//
// Template variables (Phase 26): the host declares `variables`; the user
// inserts `{{ key }}` tokens (via the inspector's `{{ }}` picker or by typing).
// The document stores only the tokens — feed real `values` to the canvas
// preview (EditorTemplateVariablesProvider) and to <DocumentRenderer variables>
// for the rendered output. One design → many data rows (mail-merge).
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Editor,
  EditorTemplateVariablesProvider,
  type EditorHandle,
  type EditorDocument,
  type TemplateVariable,
} from '@crafted-design/editor/core'
import { DocumentRenderer } from '@crafted-design/editor/renderer'
import { buildDocument } from '@crafted-design/editor/headless'
import '@crafted-design/editor/adapters/shadcn'
import '@crafted-design/editor/index.scoped.css'

// The host's declared variables (drive the picker + the canvas preview).
const VARIABLES: TemplateVariable[] = [
  { key: 'contact.name', label: 'Full name', group: 'Contact', sample: 'Jane Doe' },
  { key: 'contact.title', label: 'Job title', group: 'Contact', sample: 'Head of Product' },
  { key: 'company.name', label: 'Company', group: 'Company', sample: 'Acme Inc.' },
]

// A document "loaded from a backend" — built headlessly, with `{{ tokens }}`.
const SEED: EditorDocument = buildDocument({
  root: {
    canonical: 'box',
    style: { classes: { root: 'p-8 flex flex-col gap-2 bg-background' } },
    children: [
      { canonical: 'heading', nodeProps: { content: '{{ contact.name }}' } },
      { canonical: 'text', nodeProps: { content: '{{ contact.title }} · {{ company.name }}' } },
    ],
  },
  adapterId: 'shadcn',
})

const panel: React.CSSProperties = { minWidth: 0, overflow: 'auto' }

export default function App() {
  const [doc, setDoc] = useState<EditorDocument>(SEED)
  const editorRef = useRef<EditorHandle>(null)
  const onChange = useCallback((next: EditorDocument) => setDoc(next), [])

  // Live data the host supplies for this "row". Seeded from the samples; edit
  // the inputs to re-render the same design with different data.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(VARIABLES.map((v) => [v.key, v.sample ?? ''])),
  )
  const setValue = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }))
  // Stable identity so the editor canvas doesn't re-render needlessly.
  const liveValues = useMemo(() => values, [values])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100vh' }}>
      {/* Editor — controlled, chromeless, with the variable picker + live preview. */}
      <section style={{ ...panel, borderRight: '1px solid #e5e7eb' }}>
        <EditorTemplateVariablesProvider variables={VARIABLES} values={liveValues}>
          <Editor
            ref={editorRef}
            adapter="shadcn"
            value={doc}
            onChange={onChange}
            persistence={false}
            hideChrome
          />
        </EditorTemplateVariablesProvider>
      </section>

      {/* Host UI: edit the variable VALUES, then see the same design rendered
          with that data — plus the serialized template the host persists. */}
      <section style={{ ...panel, padding: 24 }}>
        <h2 style={{ font: '600 14px system-ui', margin: '0 0 8px' }}>Variable data</h2>
        <div style={{ display: 'grid', gap: 6, marginBottom: 20 }}>
          {VARIABLES.map((v) => (
            <label key={v.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: '#555' }}>{v.label ?? v.key}</span>
              <input
                value={values[v.key] ?? ''}
                onChange={(e) => setValue(v.key, e.target.value)}
                placeholder={`{{ ${v.key} }}`}
                style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
              />
            </label>
          ))}
        </div>

        <h2 style={{ font: '600 14px system-ui', margin: '0 0 8px' }}>
          Rendered with this data (DocumentRenderer variables)
        </h2>
        <DocumentRenderer document={doc} variables={liveValues} />

        <h2 style={{ font: '600 14px system-ui', margin: '24px 0 8px' }}>
          Saved template (tokens, not values)
        </h2>
        <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f8fafc', padding: 12, borderRadius: 6 }}>
          {JSON.stringify(doc, null, 2)}
        </pre>
      </section>
    </div>
  )
}
