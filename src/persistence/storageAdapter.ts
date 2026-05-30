import {
  createIndexedDBAdapter,
  isIndexedDBAvailable,
} from './adapters/indexedDBAdapter'
import { createLocalStorageAdapter } from './adapters/localStorageAdapter'
import type { StorageAdapter } from './types'

// Phase 14 § 6.2 — the active StorageAdapter singleton.
//
// Hosts call `setStorageAdapter(myAdapter)` BEFORE `<Editor />` mounts to
// route persistence at their own backend (mirrors registerAdapter /
// registerTheme). When unset, the default (§ 6.1) is IndexedDB, with an
// automatic fallback to localStorage where IDB is unavailable (private
// mode, locked-down browsers) — so the editor degrades to the Group A
// behavior rather than failing to load.

let active: StorageAdapter | null = null

// The default backend chooser. IndexedDB when available, else localStorage.
// Overridable via setDefaultStorageAdapterFactory (tests inject a fake).
let defaultAdapterFactory: () => StorageAdapter = () =>
  isIndexedDBAvailable()
    ? createIndexedDBAdapter()
    : createLocalStorageAdapter()

/**
 * Override the default adapter factory. Tests use it to inject a fake or
 * pin a specific backend; does not affect an adapter already set via
 * `setStorageAdapter`. Call `resetStorageAdapter()` afterward if a default
 * adapter was already built.
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
