import { useEditor } from '@craftjs/core'
import { GitBranch } from 'lucide-react'
import { useDocumentStore } from '@/persistence/documentStore'
import { CURRENT_DOCUMENT_VERSION } from '@/persistence/schema'
import { useEditorStore } from '@/state/editorStore'
import { applyEnvelopeSafely } from '../errors/applyEnvelopeSafely'

// Phase 9 § 1.8 — surfaces when useConcurrentEditWatcher detects that
// another tab wrote to the active document's localStorage blob. Two
// actions:
//   - "Reload" applies the remote envelope to the local canvas
//     (overwriting unsaved local changes). Uses applyEnvelopeSafely so
//     a malformed cross-tab write falls back to MalformedDocumentBanner.
//   - "Overwrite" saves the local snapshot back to localStorage,
//     blowing away the other tab's write.
//
// Sits as a sibling of StorageQuotaBanner in the page flow — both are
// in-flow bars (not fixed-position toasts) under the header. This makes
// the conflict visually prominent without obscuring the canvas itself.

export function ConcurrentEditBanner() {
  const { actions, query } = useEditor()
  const conflict = useEditorStore((s) => s.concurrentEditConflict)
  const setConflict = useEditorStore((s) => s.setConcurrentEditConflict)

  if (!conflict) return null

  const handleReload = async () => {
    await applyEnvelopeSafely(actions, conflict.docId, conflict.remoteEnvelope)
    setConflict(null)
  }

  const handleOverwrite = () => {
    const snapshot = {
      version: CURRENT_DOCUMENT_VERSION,
      adapterId: useEditorStore.getState().activeAdapterId,
      themeId: useEditorStore.getState().activeThemeId,
      craftJson: query.serialize(),
    }
    useDocumentStore.getState().saveActiveDocument(snapshot)
    setConflict(null)
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900"
    >
      <GitBranch size={14} className="shrink-0" aria-hidden />
      <span className="flex-1">
        This document was edited in another tab. Choose which version to
        keep — your local changes since the last save will be discarded
        on reload.
      </span>
      <button
        type="button"
        onClick={handleReload}
        className="rounded border border-amber-400 bg-ed-surface px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-100"
      >
        Reload other tab's version
      </button>
      <button
        type="button"
        onClick={handleOverwrite}
        className="rounded bg-amber-600 px-2 py-0.5 text-xs text-white hover:bg-amber-700"
      >
        Overwrite with my changes
      </button>
    </div>
  )
}
