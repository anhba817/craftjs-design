import { useEditor } from '@craftjs/core'
import { AlertOctagon, Download, FileText, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { writeDocument } from '@/persistence/documentRegistry'
import { getTemplate } from '@/persistence/templates/registry'
import { useEditorStore } from '@/state/editorStore'

// Phase 9 § 1.9 — replaces the canvas Frame when the active document
// can't be deserialized. The user sees the error message, can inspect
// the raw envelope, export it for safekeeping, or reset to the Empty
// template (which archives the broken envelope under
// `craftjs-design:doc:<id>:broken:<timestamp>` so it's recoverable
// via manual localStorage editing).
//
// Why not auto-reset: an integrity failure usually means data the user
// painstakingly built. Silently wiping it would be the worst-case
// behaviour. Forcing a deliberate "Reset to empty" click keeps the
// recovery action user-driven.

function archiveKeyFor(docId: string, ts: number): string {
  // Mirror storageKeyForDocument's namespacing so the archive lives next
  // to its sibling document blob. The `:broken:<ts>` suffix makes
  // archived versions enumerable via the same prefix.
  return `craftjs-design:doc:${docId}:broken:${ts}`
}

export function MalformedDocumentBanner() {
  const { actions } = useEditor()
  const malformed = useEditorStore((s) => s.malformedDocument)
  const setMalformedDocument = useEditorStore((s) => s.setMalformedDocument)
  const [showRaw, setShowRaw] = useState(false)
  const [resetState, setResetState] = useState<
    | { kind: 'idle' }
    | { kind: 'success' }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  if (!malformed) return null

  const handleExportRaw = () => {
    const blob = new Blob([JSON.stringify(malformed.envelope, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${malformed.docId}-broken.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    const empty = getTemplate('empty')
    if (!empty) {
      setResetState({
        kind: 'error',
        message: 'Empty template not registered',
      })
      return
    }
    try {
      // Archive the broken envelope under a timestamped key. We don't add
      // it to the document index — it lives as orphaned localStorage for
      // power-user recovery. The doc index entry keeps the same id; only
      // the contents are replaced.
      const ts = Date.now()
      localStorage.setItem(
        archiveKeyFor(malformed.docId, ts),
        JSON.stringify(malformed.envelope),
      )
      // Replace the document blob with the Empty template (only when the
      // doc has a real id — shared-fragment failures skip the rewrite
      // because there's no slot to write to).
      if (malformed.docId !== 'shared') {
        writeDocument(malformed.docId, empty.envelope)
      }
      // Apply Empty in-memory.
      actions.deserialize(empty.envelope.craftJson)
      setMalformedDocument(null)
      setResetState({ kind: 'success' })
    } catch (e) {
      setResetState({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return (
    <div
      role="alert"
      className="m-6 max-w-2xl rounded-lg border border-destructive/40 bg-destructive/5 p-5"
    >
      <div className="flex items-start gap-3">
        <AlertOctagon
          size={24}
          className="mt-0.5 shrink-0 text-destructive"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            This document can't be opened
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The saved craftJson failed to deserialize. The document's
            contents are still in storage — choose an action below to
            inspect, export, or reset to a blank canvas. Resetting
            archives the broken version under
            <code className="ml-1 rounded bg-muted px-1 text-[11px]">
              {archiveKeyFor(malformed.docId, 0).replace(/:0$/, ':<timestamp>')}
            </code>
            .
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded border border-border bg-background p-2 font-mono text-[11px]">
            {malformed.error.message}
          </pre>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-background px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <FileText size={12} />
              {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
            </button>
            <button
              type="button"
              onClick={handleExportRaw}
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-background px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Download size={12} />
              Export raw
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded bg-destructive px-2.5 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              <RefreshCcw size={12} />
              Reset to empty
            </button>
          </div>

          {resetState.kind === 'error' && (
            <p className="mt-3 text-xs text-destructive">
              Reset failed: {resetState.message}
            </p>
          )}
          {resetState.kind === 'success' && (
            <p className="mt-3 text-xs text-muted-foreground">
              Document reset; broken version archived in localStorage.
            </p>
          )}

          {showRaw && (
            <pre
              aria-label="Raw envelope JSON"
              className="mt-3 max-h-96 overflow-auto rounded border border-border bg-background p-2 font-mono text-[11px]"
            >
              {JSON.stringify(malformed.envelope, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
