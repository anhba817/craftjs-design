import { AlertTriangle, X } from 'lucide-react'
import { useEditorStore } from '@/state/editorStore'

// Phase 9 § 1.7 — surface localStorage usage as it approaches the
// conservative 5 MB ceiling. Triggers at ≥80% so the designer has
// time to export or delete before hitting the actual quota — at
// which point QuotaExceededError surfaces via <StorageQuotaErrorModal>.
//
// Dismiss state lives in sessionStorage (set by editorStore) so it
// survives a reload in the same tab but resets when the tab closes.
// Crossing the 80% threshold downward also clears the dismiss flag —
// it then re-appears next time usage climbs back over.
//
// Layout: a thin bar below the header. Fixed position would compete
// with AsyncErrorBanner; sitting in the document flow keeps things
// simple. Editor.tsx renders this between <header> and the layout
// row so it pushes the canvas + asides down by one line when active.

const WARNING_THRESHOLD = 80

export function StorageQuotaBanner() {
  const percent = useEditorStore((s) => s.storageQuotaPercent)
  const dismissed = useEditorStore((s) => s.storageQuotaDismissed)
  const dismiss = useEditorStore((s) => s.dismissStorageQuotaBanner)

  if (percent < WARNING_THRESHOLD || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900"
    >
      <AlertTriangle size={14} className="shrink-0" aria-hidden />
      <span className="flex-1">
        Storage is <strong>{percent.toFixed(0)}%</strong> full. Open the
        document menu to export or delete older documents before you run
        out of space.
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss storage warning"
        className="rounded p-1 hover:bg-amber-100"
      >
        <X size={12} />
      </button>
    </div>
  )
}
