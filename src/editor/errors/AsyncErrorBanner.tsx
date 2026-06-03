import { AlertTriangle, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { AsyncErrorInfo } from './asyncError'
import { useGlobalErrorHandler } from './useGlobalErrorHandler'

// Phase 9 § 1.6 — non-blocking banner for uncaught async errors.
//
// Mounted once at editor scope. Surfaces the most recent error in a
// fixed-position toast with a Dismiss button. The user can keep working;
// the toast disappears on dismiss or when the editor unmounts.
//
// Why not a global modal: most async errors aren't worth interrupting the
// design flow for (a missing eyedropper API, a fetch failure for an
// optional asset, a font that didn't load). Critical failures route to
// ErrorBoundary instead — those still take down the affected subtree.
//
// Toast position is bottom-right to avoid colliding with the top header,
// the canvas Resize handles, and the Inspector. `pointer-events-auto` lets
// the user click Dismiss; the surrounding fixed positioning doesn't block
// pointer events outside its own box.

export function AsyncErrorBanner() {
  const [error, setError] = useState<AsyncErrorInfo | null>(null)

  // Latest-error semantics: a new async error replaces whatever was showing.
  // Designers typically only act on the most recent one; older errors stay
  // available via the dev console (axe-init's reverse-of console hook plus
  // the browser's own uncaught-error logging).
  const handleError = useCallback((info: AsyncErrorInfo) => {
    setError(info)
  }, [])
  useGlobalErrorHandler(handleError)

  if (!error) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="pointer-events-auto fixed bottom-4 right-4 z-50 max-w-md rounded border border-ed-danger/40 bg-ed-surface shadow-lg"
    >
      <div className="flex items-start gap-2 p-3">
        <AlertTriangle
          size={16}
          className="mt-0.5 shrink-0 text-ed-danger"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-ed-text-strong">
            {error.source === 'promise-rejection'
              ? 'Unhandled promise rejection'
              : 'Async error'}
          </div>
          <p
            className="mt-0.5 break-words text-xs text-ed-text-muted"
            title={error.message}
          >
            {error.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setError(null)}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 rounded p-1 text-ed-text-faint hover:bg-ed-surface-3 hover:text-ed-text"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
