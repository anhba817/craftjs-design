// Phase 9 § 1.6 — async error coverage.
//
// Pure helpers + types for the global async error handler. Kept separate
// from the React hook + Banner UI so they can be unit-tested without a
// DOM render harness.

export type AsyncErrorSource = 'window-error' | 'promise-rejection'

export interface AsyncErrorInfo {
  message: string
  source: AsyncErrorSource
  // Original Error instance when available (preserves stack for telemetry).
  // For rejection reasons that aren't Errors (string, object, undefined),
  // this is null and the caller can rely on `message` only.
  error: Error | null
  timestamp: number
}

/**
 * Normalises a native `ErrorEvent` to AsyncErrorInfo.
 *
 * `ErrorEvent.message` is the script's display message; `ErrorEvent.error`
 * carries the actual Error instance with a stack trace (when the browser
 * could attribute one). We prefer the Error's message when present —
 * `ErrorEvent.message` is often a generic "Script error." when the source
 * was cross-origin and the browser stripped the detail.
 */
export function normalizeErrorEvent(event: ErrorEvent): AsyncErrorInfo {
  const err = event.error
  const isError = err instanceof Error
  const message = isError && err.message ? err.message : event.message || 'Uncaught error'
  return {
    message,
    source: 'window-error',
    error: isError ? err : null,
    timestamp: Date.now(),
  }
}

/**
 * Normalises a `PromiseRejectionEvent` to AsyncErrorInfo.
 *
 * `event.reason` can be anything — most commonly an Error, sometimes a
 * string thrown directly (`throw "boom"`), occasionally an object or
 * undefined. We extract a stable message for all shapes.
 */
export function normalizeRejectionEvent(
  event: PromiseRejectionEvent,
): AsyncErrorInfo {
  const reason = event.reason
  let message: string
  let error: Error | null = null
  if (reason instanceof Error) {
    error = reason
    message = reason.message || 'Promise rejected'
  } else if (typeof reason === 'string') {
    message = reason
  } else if (reason && typeof reason === 'object') {
    // Common shape: `{ message: '...' }`.
    const maybeMessage = (reason as { message?: unknown }).message
    message = typeof maybeMessage === 'string' ? maybeMessage : 'Promise rejected'
  } else {
    message = 'Promise rejected'
  }
  return {
    message,
    source: 'promise-rejection',
    error,
    timestamp: Date.now(),
  }
}
