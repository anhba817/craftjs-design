import { AlertOctagon } from 'lucide-react'
import { useEditorStore } from '@/state/editorStore'

// Phase 9 § 1.7 — blocking modal shown when localStorage.setItem throws
// QuotaExceededError. The save did NOT complete; the user must either
// free space (delete a document via the Documents menu in the toolbar)
// or acknowledge that subsequent edits won't be persisted.
//
// "Continue without saving" doesn't disable saving — it just dismisses
// the modal. The very next save will retry, hit the same error, and
// re-trigger the modal. The wording reflects that ("continue without
// saving [this attempt]"). For sustained safety the user has to delete
// data.

export function StorageQuotaErrorModal() {
  const saveFailed = useEditorStore((s) => s.storageSaveFailed)
  const setSaveFailed = useEditorStore((s) => s.setStorageSaveFailed)

  if (!saveFailed) return null

  const handleDismiss = () => setSaveFailed(null)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-quota-modal-title"
      // Fixed full-screen scrim. Pointer events are captured to make the
      // dialog blocking; the user can't interact with the editor until
      // they pick an action.
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-ed-danger/40 bg-ed-surface p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertOctagon
            size={24}
            className="mt-0.5 shrink-0 text-ed-danger"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h2
              id="storage-quota-modal-title"
              className="text-base font-semibold text-ed-text-strong"
            >
              Couldn't save — storage is full
            </h2>
            <p className="mt-2 text-sm text-ed-text-muted">
              Your last change wasn't saved because the browser's
              localStorage quota for this origin is exhausted. To keep
              editing safely, open the document menu in the toolbar and
              delete or export an older document.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded border border-ed-border-2 px-3 py-1.5 text-sm text-ed-text hover:bg-ed-surface-2"
              >
                Continue without saving
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                // Same handler — closing the modal IS the path to the
                // Documents menu (which lives in the toolbar). A future
                // enhancement could pop the menu programmatically, but
                // for now we route the user via the existing UI.
                className="rounded bg-ed-accent px-3 py-1.5 text-sm font-medium text-ed-accent-fg hover:bg-ed-accent/90"
              >
                Open documents menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
