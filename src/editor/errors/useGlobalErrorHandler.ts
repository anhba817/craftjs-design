import { useEffect, useRef } from 'react'
import {
  normalizeErrorEvent,
  normalizeRejectionEvent,
  type AsyncErrorInfo,
} from './asyncError'

/**
 * Phase 9 § 1.6 — global async error handler hook.
 *
 * Listens to `window.error` and `window.unhandledrejection` events and
 * forwards them to the given callback in a normalised shape. The callback
 * doesn't have to be stable — the hook stores it in a ref so handler
 * registration only happens once per mount.
 *
 * Errors thrown during a React render are NOT caught here — they're
 * caught by ErrorBoundary instead. This handler covers the gap:
 *   - effect callbacks throwing
 *   - event listeners throwing (`onClick`, etc.)
 *   - promise rejections (no `.catch()`)
 *   - native APIs that defer errors to the next tick (fetch, etc.)
 *
 * Intentionally side-effect-only — the hook doesn't return state. The
 * `<AsyncErrorBanner>` component wraps this hook and manages the UI.
 */
export function useGlobalErrorHandler(
  onError: (info: AsyncErrorInfo) => void,
): void {
  const callbackRef = useRef(onError)
  callbackRef.current = onError

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      callbackRef.current(normalizeErrorEvent(event))
    }
    const handleRejection = (event: PromiseRejectionEvent) => {
      callbackRef.current(normalizeRejectionEvent(event))
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])
}
