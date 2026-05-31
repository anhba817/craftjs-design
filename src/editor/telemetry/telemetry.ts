// Phase 15 § 13.1 / 13.2 / 13.4 — observability seam.
//
// One place the host plugs in error + metric handlers; the editor's error
// boundaries and timed flows call into it. The editor itself collects
// NOTHING and ships no analytics — these handlers only fire if the host
// installs them.
//
// A module-level singleton (mirroring setStorageAdapter) rather than a
// React context: the error boundaries are class components, and the
// top-shell boundary sits OUTSIDE the editor's React tree (App wraps
// <Editor/> in it), so a context provider couldn't reach every boundary.
// The <TelemetryProvider> below is an ergonomic wrapper that just installs
// the handlers on mount.

export interface TelemetryErrorInfo {
  /** React's component stack for the throwing subtree, when available. */
  componentStack?: string
  /** Which boundary caught it ('shell' | 'canvas' | 'toolbox' | 'panel' | …). */
  boundary?: string
}

export interface TelemetryMetric {
  /** Dotted metric name, e.g. 'document.apply' or 'document.bootstrap'. */
  name: string
  /** Duration in milliseconds for timed flows. */
  durationMs?: number
  /** Optional extra context (doc id, node count, …). */
  [key: string]: unknown
}

export interface TelemetryHandlers {
  onError?: (error: Error, info: TelemetryErrorInfo) => void
  onMetric?: (metric: TelemetryMetric) => void
}

let handlers: TelemetryHandlers = {}

/** Install host telemetry handlers. Call before/at editor mount. */
export function setTelemetry(next: TelemetryHandlers): void {
  handlers = next ?? {}
}

/** The active handlers (empty object when the host installed none). */
export function getTelemetry(): TelemetryHandlers {
  return handlers
}

/** Fire the error handler if installed; otherwise a no-op (boundaries log). */
export function reportError(error: Error, info: TelemetryErrorInfo): void {
  handlers.onError?.(error, info)
}

/** Fire the metric handler if installed; otherwise a no-op. */
export function emitMetric(metric: TelemetryMetric): void {
  handlers.onMetric?.(metric)
}

/**
 * Time a synchronous or async operation and emit a metric with its
 * duration. Returns the operation's result. No-op overhead beyond a
 * timestamp when no handler is installed.
 */
export async function timed<T>(
  name: string,
  op: () => T | Promise<T>,
  extra?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now()
  try {
    return await op()
  } finally {
    emitMetric({ name, durationMs: Date.now() - start, ...extra })
  }
}

/** @internal test-only reset. */
export function _resetTelemetryForTest(): void {
  handlers = {}
}
