import { documentSchema } from './schema'
import type { EditorDocument } from './schema'

// Pure helper — serializes an envelope to a Blob without touching the DOM.
// Used by downloadDocument below AND by tests that don't have a DOM at hand.
//
// Validating with documentSchema.parse here means a stale or hand-mutated
// envelope produces a clear schema error at export time rather than a
// confusing "your downloaded file is malformed" report later.
export function exportDocument(doc: EditorDocument): Blob {
  const parsed = documentSchema.parse(doc)
  return new Blob([JSON.stringify(parsed, null, 2)], {
    type: 'application/json',
  })
}

// Browser-side helper — wraps exportDocument in the standard "click a synthetic
// <a download>" download pattern. Kept distinct from exportDocument so the
// pure Blob path stays testable without a DOM.
export function downloadDocument(
  doc: EditorDocument,
  suggestedName: string,
): void {
  const blob = exportDocument(doc)
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = ensureJsonExtension(suggestedName)
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  // Free the object URL. Some browsers leak the blob otherwise. Defer to next
  // tick so the download initiation has time to read the URL.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// Default file extension is `.craftjs-design.json` — double extension makes
// it easy to associate with the editor without losing the visible `.json`
// suffix that signals "this is JSON" to users + OS tooling.
const DEFAULT_EXTENSION = '.craftjs-design.json'

function ensureJsonExtension(name: string): string {
  if (name.endsWith(DEFAULT_EXTENSION)) return name
  if (name.endsWith('.json')) return name
  return `${name}${DEFAULT_EXTENSION}`
}
