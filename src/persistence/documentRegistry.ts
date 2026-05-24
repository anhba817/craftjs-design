import { migrateDocument } from './migrations'
import { documentSchema } from './schema'
import type { EditorDocument } from './schema'

// Phase 7 multi-document storage. Each document lives at its own localStorage
// key keyed by stable id; a single index key tracks the document list and the
// currently-active id. The v1 single-key shape (`craftjs-design:doc:v1`) is
// auto-migrated on first read.
//
// This module is PURE — it only talks to localStorage. No module-level state.
// The Zustand wrapper in ./documentStore caches reads for the UI layer.

export const STORAGE_KEY_INDEX = 'craftjs-design:doc-index:v2'
export const LEGACY_V1_KEY = 'craftjs-design:doc:v1'

export function storageKeyForDocument(id: string): string {
  return `craftjs-design:doc:${id}:v2`
}

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

const EMPTY_INDEX: DocumentIndex = { documents: [], activeId: null }

// Random short id. Phase 7 documents are user-scoped; collisions across users
// don't matter, and the editor only carries dozens of documents per user, so
// 8 base36 chars (~41 bits) is enough.
export function newDocumentId(): string {
  return `doc-${Math.random().toString(36).slice(2, 10)}`
}

export function readDocumentIndex(): DocumentIndex {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INDEX)
    if (!raw) return { ...EMPTY_INDEX }
    const parsed = JSON.parse(raw)
    return {
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
    }
  } catch {
    return { ...EMPTY_INDEX }
  }
}

export function writeDocumentIndex(index: DocumentIndex): void {
  try {
    localStorage.setItem(STORAGE_KEY_INDEX, JSON.stringify(index))
  } catch (err) {
    // QuotaExceeded etc. — log but don't throw; surface via a future banner.
    console.error('[documentRegistry] writeDocumentIndex failed:', err)
  }
}

export function readDocument(id: string): EditorDocument | null {
  try {
    const raw = localStorage.getItem(storageKeyForDocument(id))
    if (!raw) return null
    const envelope = documentSchema.parse(JSON.parse(raw))
    return migrateDocument(envelope)
  } catch (err) {
    console.error('[documentRegistry] readDocument', id, 'failed:', err)
    return null
  }
}

export function writeDocument(id: string, doc: EditorDocument): void {
  try {
    const parsed = documentSchema.parse(doc)
    localStorage.setItem(storageKeyForDocument(id), JSON.stringify(parsed))
  } catch (err) {
    console.error('[documentRegistry] writeDocument', id, 'failed:', err)
  }
}

export function deleteDocumentBlob(id: string): void {
  try {
    localStorage.removeItem(storageKeyForDocument(id))
  } catch (err) {
    console.error('[documentRegistry] deleteDocumentBlob', id, 'failed:', err)
  }
}

/**
 * If a legacy v1 document exists and the v2 index is empty, migrate by
 * creating a single "Untitled" entry in v2 pointing to the v1 contents.
 * Idempotent — once :doc:v1 is removed (after a successful migration),
 * subsequent calls return null.
 *
 * Returns the new index on a successful migration, null otherwise.
 */
export function migrateLegacyV1(): DocumentIndex | null {
  const current = readDocumentIndex()
  if (current.documents.length > 0) return null

  let legacy: string | null
  try {
    legacy = localStorage.getItem(LEGACY_V1_KEY)
  } catch {
    return null
  }
  if (!legacy) return null

  try {
    const envelope = documentSchema.parse(JSON.parse(legacy))
    const id = newDocumentId()
    const now = Date.now()
    const summary: DocumentSummary = {
      id,
      name: 'Untitled',
      created: now,
      updated: now,
    }
    const newIndex: DocumentIndex = {
      documents: [summary],
      activeId: id,
    }
    writeDocument(id, envelope)
    writeDocumentIndex(newIndex)
    localStorage.removeItem(LEGACY_V1_KEY)
    return newIndex
  } catch (err) {
    console.warn('[documentRegistry] legacy v1 migration failed:', err)
    return null
  }
}
