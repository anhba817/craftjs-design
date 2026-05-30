import {
  deleteDocumentBlob,
  getStorageUsage,
  migrateLegacyV1,
  readDocument,
  readDocumentIndex,
  writeDocument,
  writeDocumentIndex,
} from '../documentRegistry'
import type { EditorDocument } from '../schema'
import type {
  DocumentIndex,
  StorageAdapter,
  StorageUsage,
  WriteResult,
} from '../types'

// Phase 14 § 6.2 — localStorage StorageAdapter.
//
// A thin async wrapper over the proven synchronous primitives in
// documentRegistry. Those primitives (and their tests) are untouched —
// this adapter just `Promise`-wraps them so localStorage satisfies the
// same async interface as IndexedDB / a server backend. It's the
// fallback adapter when IndexedDB is unavailable (private mode, old
// browsers), and the behavior-identical baseline the async refactor was
// validated against before IDB existed.
//
// Snapshot methods (listVersions / readVersion / writeVersion) are
// intentionally omitted — localStorage's ~5 MB ceiling can't afford a
// version history. Group D caps or disables snapshots on this adapter;
// the document store treats their absence as "versioning unsupported".
export function createLocalStorageAdapter(): StorageAdapter {
  return {
    // The v1 → v2 single-doc migration runs once during bootstrap, before
    // the first readIndex. Idempotent — a no-op once :doc:v1 is gone.
    async init(): Promise<void> {
      migrateLegacyV1()
    },

    async readIndex(): Promise<DocumentIndex> {
      return readDocumentIndex()
    },

    async writeIndex(index: DocumentIndex): Promise<WriteResult> {
      return writeDocumentIndex(index)
    },

    async readDocument(id: string): Promise<EditorDocument | null> {
      return readDocument(id)
    },

    async writeDocument(id: string, doc: EditorDocument): Promise<WriteResult> {
      return writeDocument(id, doc)
    },

    async deleteDocument(id: string): Promise<void> {
      deleteDocumentBlob(id)
    },

    async estimateUsage(): Promise<StorageUsage> {
      return getStorageUsage()
    },
  }
}
