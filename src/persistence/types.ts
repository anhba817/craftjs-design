import type { EditorDocument } from './schema'

// Phase 14 § 6.2 — shared persistence types + the StorageAdapter seam.
//
// These live in their own module (rather than in documentRegistry) so the
// adapter interface, the concrete adapters, and the document store all
// import from one place without a dependency cycle through the
// localStorage implementation.

export interface DocumentSummary {
  id: string
  name: string
  // Epoch milliseconds. Tracked in the index so the document picker can sort
  // by recency without reading every blob.
  created: number
  updated: number
}

export interface DocumentIndex {
  documents: DocumentSummary[]
  activeId: string | null
}

// Phase 9 § 1.7 — every write returns a typed result so callers can react
// to a QuotaExceededError without parsing console logs. `'quota'` is the
// only programmatically-recoverable failure; `'schema'` (Zod parse) and
// `'unknown'` mean the data was rejected and the caller can't help.
export type WriteResult =
  | { ok: true }
  | { ok: false; kind: 'quota' | 'schema' | 'unknown'; error: unknown }

export interface StorageUsage {
  usedBytes: number
  totalBytes: number
  percent: number
}

// Phase 14 § 6.3 — version snapshot metadata. Defined here so the adapter
// interface can reference it; the versioning UI lands in Group D. Adapters
// that can't store snapshots omit the optional `*Version` methods and the
// UI hides the controls.
export interface DocumentVersion {
  versionId: string
  // Epoch ms the snapshot was taken.
  created: number
  // Optional user-supplied label for a manual save point; absent for
  // auto-snapshots.
  label?: string
  // 'auto' = ring-buffer snapshot on save; 'manual' = explicit save point
  // (exempt from eviction).
  kind: 'auto' | 'manual'
}

// Phase 14 § 6.2 — the persistence seam. The editor talks to ONE of these;
// the default is the IndexedDB adapter (Group B) with a localStorage
// fallback. Hosts register their own backend via `setStorageAdapter`.
//
// Index = the `{documents[], activeId}` pointer the document picker reads.
// Documents are stored by id. All I/O is async — IndexedDB and remote
// backends can't be synchronous.
export interface StorageAdapter {
  // Optional one-time setup (e.g. the localStorage adapter's v1→v2
  // migration, or the IDB adapter's localStorage import). Awaited by the
  // store's bootstrap before the first `readIndex`.
  init?(): Promise<void>

  readIndex(): Promise<DocumentIndex>
  writeIndex(index: DocumentIndex): Promise<WriteResult>

  readDocument(id: string): Promise<EditorDocument | null>
  writeDocument(id: string, doc: EditorDocument): Promise<WriteResult>
  deleteDocument(id: string): Promise<void>

  estimateUsage(): Promise<StorageUsage>

  // Phase 14 § 6.3 (Group D) — optional snapshot support.
  listVersions?(id: string): Promise<DocumentVersion[]>
  readVersion?(id: string, versionId: string): Promise<EditorDocument | null>
  writeVersion?(
    id: string,
    doc: EditorDocument,
    meta: { label?: string; kind: 'auto' | 'manual' },
  ): Promise<WriteResult>
}
