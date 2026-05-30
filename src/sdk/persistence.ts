// Public SDK — persistence backend surface (Phase 14 § 6.2).
//
// By default the editor persists documents to IndexedDB (with a
// localStorage fallback). Hosts that want documents in their own backend
// implement `StorageAdapter` and register it BEFORE rendering `<Editor />`:
//
// @example
//   import { setStorageAdapter } from '@crafted-design/editor/sdk'
//
//   setStorageAdapter({
//     async readIndex() { return fetch('/api/docs/index').then(r => r.json()) },
//     async writeIndex(index) { await fetch('/api/docs/index', { method: 'PUT', body: JSON.stringify(index) }); return { ok: true } },
//     async readDocument(id) { /* … */ },
//     async writeDocument(id, doc) { /* … */ return { ok: true } },
//     async deleteDocument(id) { /* … */ },
//     async estimateUsage() { return { usedBytes: 0, totalBytes: Infinity, percent: 0 } },
//   })
//
// All methods are async. The optional `init`, `listVersions`,
// `readVersion`, and `writeVersion` methods are for one-time setup and
// document snapshots (versioning UI hides itself when they're absent).
export { setStorageAdapter, getStorageAdapter } from '../persistence/storageAdapter'
export type {
  StorageAdapter,
  DocumentIndex,
  DocumentSummary,
  DocumentVersion,
  StorageUsage,
  WriteResult,
} from '../persistence/types'
export type { EditorDocument } from '../persistence/schema'
