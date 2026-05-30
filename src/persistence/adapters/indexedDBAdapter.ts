import { migrateDocument } from '../migrations'
import { documentSchema } from '../schema'
import type { EditorDocument } from '../schema'
import type {
  DocumentIndex,
  StorageAdapter,
  StorageUsage,
  WriteResult,
} from '../types'
import { createLocalStorageAdapter } from './localStorageAdapter'

// Phase 14 § 6.1 — IndexedDB StorageAdapter, the default backend.
//
// IndexedDB has hundreds of MB of quota (vs localStorage's ~5 MB), so the
// ~100-document ceiling goes away. Hand-rolled promise wrapper over the
// raw IDB API — no `idb` dependency for a handful of get/put/delete calls.
//
// Three object stores, all out-of-line keys:
//   - documents — one EditorDocument per id
//   - meta      — the single DocumentIndex under INDEX_KEY
//   - versions  — Group D snapshots (created now so no DB-version bump later)

const DB_NAME = 'crafted-design'
const DB_VERSION = 1
const STORE_DOCUMENTS = 'documents'
const STORE_META = 'meta'
const STORE_VERSIONS = 'versions'
const INDEX_KEY = 'index'

export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null
}

function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: unknown }).name
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

const EMPTY_INDEX: DocumentIndex = { documents: [], activeId: null }

export function createIndexedDBAdapter(): StorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null

  function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_DOCUMENTS))
          db.createObjectStore(STORE_DOCUMENTS)
        if (!db.objectStoreNames.contains(STORE_META))
          db.createObjectStore(STORE_META)
        if (!db.objectStoreNames.contains(STORE_VERSIONS))
          db.createObjectStore(STORE_VERSIONS)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    return dbPromise
  }

  // Run one transaction, await both the operation's request AND the
  // transaction's completion (a put can "succeed" but the txn still abort
  // on quota — we surface that).
  async function tx<T>(
    store: string,
    mode: IDBTransactionMode,
    op: (s: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await openDB()
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(store, mode)
      const request = op(transaction.objectStore(store))
      let result: T
      request.onsuccess = () => {
        result = request.result
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve(result)
      transaction.onabort = () => reject(transaction.error)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  const adapter: StorageAdapter = {
    // First-boot import of any existing localStorage documents (decision
    // in PHASE14_PLAN § B3). Idempotent — only runs while IDB is empty.
    async init(): Promise<void> {
      try {
        const idbIndex = await adapter.readIndex()
        if (idbIndex.documents.length > 0) return
        if (typeof localStorage === 'undefined') return
        const ls = createLocalStorageAdapter()
        await ls.init?.() // v1 → v2 first
        const lsIndex = await ls.readIndex()
        if (lsIndex.documents.length === 0) return
        for (const summary of lsIndex.documents) {
          const doc = await ls.readDocument(summary.id)
          if (doc) await adapter.writeDocument(summary.id, doc)
        }
        await adapter.writeIndex(lsIndex)
        // Legacy localStorage keys are left in place one release for
        // safety; a later phase prunes them.
      } catch (err) {
        console.warn('[indexedDBAdapter] localStorage import skipped:', err)
      }
    },

    async readIndex(): Promise<DocumentIndex> {
      try {
        const raw = await tx<unknown>(STORE_META, 'readonly', (s) =>
          s.get(INDEX_KEY),
        )
        if (!raw || typeof raw !== 'object') return { ...EMPTY_INDEX }
        const parsed = raw as Partial<DocumentIndex>
        return {
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
        }
      } catch (err) {
        console.error('[indexedDBAdapter] readIndex failed:', err)
        return { ...EMPTY_INDEX }
      }
    },

    async writeIndex(index: DocumentIndex): Promise<WriteResult> {
      try {
        await tx(STORE_META, 'readwrite', (s) => s.put(index, INDEX_KEY))
        return { ok: true }
      } catch (err) {
        if (isQuotaExceededError(err)) return { ok: false, kind: 'quota', error: err }
        console.error('[indexedDBAdapter] writeIndex failed:', err)
        return { ok: false, kind: 'unknown', error: err }
      }
    },

    async readDocument(id: string): Promise<EditorDocument | null> {
      try {
        const raw = await tx<unknown>(STORE_DOCUMENTS, 'readonly', (s) =>
          s.get(id),
        )
        if (raw === undefined || raw === null) return null
        const envelope = documentSchema.parse(raw)
        return migrateDocument(envelope)
      } catch (err) {
        console.error('[indexedDBAdapter] readDocument', id, 'failed:', err)
        return null
      }
    },

    async writeDocument(id: string, doc: EditorDocument): Promise<WriteResult> {
      let parsed: EditorDocument
      try {
        parsed = documentSchema.parse(doc)
      } catch (err) {
        console.error('[indexedDBAdapter] writeDocument schema', id, ':', err)
        return { ok: false, kind: 'schema', error: err }
      }
      try {
        await tx(STORE_DOCUMENTS, 'readwrite', (s) => s.put(parsed, id))
        return { ok: true }
      } catch (err) {
        if (isQuotaExceededError(err)) return { ok: false, kind: 'quota', error: err }
        console.error('[indexedDBAdapter] writeDocument', id, ':', err)
        return { ok: false, kind: 'unknown', error: err }
      }
    },

    async deleteDocument(id: string): Promise<void> {
      try {
        await tx(STORE_DOCUMENTS, 'readwrite', (s) => s.delete(id))
      } catch (err) {
        console.error('[indexedDBAdapter] deleteDocument', id, 'failed:', err)
      }
    },

    async estimateUsage(): Promise<StorageUsage> {
      // navigator.storage.estimate() reports the real per-origin quota
      // (hundreds of MB on IDB) — far better than localStorage's byte scan.
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.storage?.estimate
        ) {
          const { usage = 0, quota = 0 } = await navigator.storage.estimate()
          const totalBytes = quota || 0
          return {
            usedBytes: usage,
            totalBytes,
            percent: totalBytes > 0 ? (usage / totalBytes) * 100 : 0,
          }
        }
      } catch {
        // fall through to the conservative default
      }
      // Unknown quota — report a large ceiling at 0% so the banner stays quiet.
      return { usedBytes: 0, totalBytes: Number.POSITIVE_INFINITY, percent: 0 }
    },
  }

  // Expose the store name so Group D's version methods can be slotted onto
  // this same adapter without re-declaring the schema.
  void STORE_VERSIONS

  return adapter
}
