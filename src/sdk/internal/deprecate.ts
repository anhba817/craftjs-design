// Phase 10 § 2.4 — deprecation warning helper for the SDK.
//
// External consumers depending on a soon-to-be-removed export should
// see ONE warning per call site per session — never spam. This module
// owns that side effect.
//
// Usage from an SDK module:
//
//   import { deprecate } from './internal/deprecate'
//
//   export function oldFunction(...args: SomeArgs): SomeResult {
//     deprecate({
//       api: 'oldFunction',
//       since: '0.2.0',
//       removeIn: '1.0.0',
//       migration: 'Use newFunction(...) — same signature with extra `mode` arg.',
//     })
//     return newFunction(...args, { mode: 'default' })
//   }
//
// The migration string is the most important field — it tells the
// consumer EXACTLY what to change. Without it, the warning is noise.

export interface DeprecationNotice {
  /** The deprecated symbol name (function / type / hook). Used as the dedupe key. */
  api: string
  /** Version where deprecation was introduced (e.g., '0.2.0'). */
  since: string
  /** Planned removal version (e.g., '1.0.0'). */
  removeIn: string
  /** One-line migration instructions. Required — without it the warning is unhelpful. */
  migration: string
}

// Per-session de-dupe. Cleared automatically when the page reloads;
// no need for a TTL.
const warned = new Set<string>()

/**
 * Log a deprecation warning to the console at most once per session per
 * `notice.api`. Returns void; the caller continues executing — the
 * deprecation is advisory, not blocking.
 *
 * Behaviour:
 *   - First call for a given `api`: emits `console.warn` with a
 *     standardised "[deprecated]" prefix + the migration hint.
 *   - Subsequent calls for the same `api` in the same session: no-op.
 *   - `notice` is the same shape across all callers so logs are
 *     machine-parseable if a host wants to forward them to telemetry.
 */
export function deprecate(notice: DeprecationNotice): void {
  if (warned.has(notice.api)) return
  warned.add(notice.api)
  // Guard against a host environment without console (very old SSR
  // scaffolds, tests with console silenced). Skip silently if so.
  if (typeof console === 'undefined' || typeof console.warn !== 'function') {
    return
  }
  console.warn(
    `[deprecated] ${notice.api} is deprecated since ${notice.since} and will be removed in ${notice.removeIn}. ${notice.migration}`,
  )
}

/**
 * Test-only — clears the per-session dedupe set so tests can assert the
 * warning fires.
 */
export function _resetDeprecationCacheForTests(): void {
  warned.clear()
}
