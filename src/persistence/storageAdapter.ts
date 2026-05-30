import { createLocalStorageAdapter } from './adapters/localStorageAdapter'
import type { StorageAdapter } from './types'

// Phase 14 § 6.2 — the active StorageAdapter singleton.
//
// Hosts call `setStorageAdapter(myAdapter)` BEFORE `<Editor />` mounts to
// route persistence at their own backend (mirrors registerAdapter /
// registerTheme). When unset, the default is resolved lazily by
// `defaultAdapterFactory` — Group A ships the localStorage adapter as the
// default; Group B swaps in IndexedDB (with a localStorage fallback when
// IDB is unavailable).

let active: StorageAdapter | null = null

// Indirection so Group B can replace the default without this module
// importing the (heavier) IndexedDB adapter directly. Group A's default
// is localStorage.
let defaultAdapterFactory: () => StorageAdapter = createLocalStorageAdapter

/**
 * Override the default adapter factory. Group B calls this at module load
 * to make IndexedDB the default; tests use it to inject a fake. Does not
 * affect an adapter already set via `setStorageAdapter`.
 */
export function setDefaultStorageAdapterFactory(
  factory: () => StorageAdapter,
): void {
  defaultAdapterFactory = factory
}

/** Host entry point — choose the backend. Must run before `<Editor />`. */
export function setStorageAdapter(adapter: StorageAdapter): void {
  active = adapter
}

/** The active adapter, lazily defaulting on first use. */
export function getStorageAdapter(): StorageAdapter {
  if (!active) active = defaultAdapterFactory()
  return active
}

/** Test helper — drop the cached adapter so the next get rebuilds it. */
export function resetStorageAdapter(): void {
  active = null
}
