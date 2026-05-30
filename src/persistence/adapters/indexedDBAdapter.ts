import { migrateDocument } from '../migrations'
import { documentSchema } from '../schema'
import type { EditorDocument } from '../schema'
import type {
  DocumentIndex,
  DocumentVersion,
  StorageAdapter,
  StorageUsage,
  WriteResult,
} from '../types'
import { createLocalStorageAdapter } from './localStorageAdapter'

// Keep at most this many auto-snapshots per document (ring buffer, oldest
// evicted). Manual save points are exempt. IDB's quota affords this
// comfortably; the localStorage adapter omits versioning entirely.
const MAX_AUTO_VERSIONS = 20

// Stored version record (value in the `versions` store).
interface VersionRecord extends DocumentVersion {
  docId: string
  doc: EditorDocument
}

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

    // Phase 14 § 6.3 — version snapshots, stored in the `versions` store
    // under composite keys `${docId}::${versionId}` so all of a document's
    // versions form a contiguous key range (no secondary index needed).
    async listVersions(id: string): Promise<DocumentVersion[]> {
      try {
        const range = IDBKeyRange.bound(`${id}::`, `${id}::￿`)
        const records = await tx<VersionRecord[]>(STORE_VERSIONS, 'readonly', (s) =>
          s.getAll(range),
        )
        // Newest first; strip the stored doc + docId from the public meta.
        return records
          .map(({ versionId, created, label, kind }) => ({
            versionId,
            created,
            label,
            kind,
          }))
          .sort((a, b) => b.created - a.created)
      } catch (err) {
        console.error('[indexedDBAdapter] listVersions', id, 'failed:', err)
        return []
      }
    },

    async readVersion(
      id: string,
      versionId: string,
    ): Promise<EditorDocument | null> {
      try {
        const record = await tx<VersionRecord | undefined>(
          STORE_VERSIONS,
          'readonly',
          (s) => s.get(`${id}::${versionId}`),
        )
        if (!record) return null
        return migrateDocument(documentSchema.parse(record.doc))
      } catch (err) {
        console.error('[indexedDBAdapter] readVersion', id, versionId, ':', err)
        return null
      }
    },

    async writeVersion(
      id: string,
      doc: EditorDocument,
      meta: { label?: string; kind: 'auto' | 'manual' },
    ): Promise<WriteResult> {
      let parsed: EditorDocument
      try {
        parsed = documentSchema.parse(doc)
      } catch (err) {
        return { ok: false, kind: 'schema', error: err }
      }
      const versionId = `v-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`
      const record: VersionRecord = {
        versionId,
        created: Date.now(),
        label: meta.label,
        kind: meta.kind,
        docId: id,
        doc: parsed,
      }
      try {
        await tx(STORE_VERSIONS, 'readwrite', (s) =>
          s.put(record, `${id}::${versionId}`),
        )
      } catch (err) {
        if (isQuotaExceededError(err)) return { ok: false, kind: 'quota', error: err }
        console.error('[indexedDBAdapter] writeVersion', id, ':', err)
        return { ok: false, kind: 'unknown', error: err }
      }
      // Ring-buffer prune: keep only the newest MAX_AUTO_VERSIONS autos.
      // Manual save points are exempt.
      if (meta.kind === 'auto') {
        try {
          const range = IDBKeyRange.bound(`${id}::`, `${id}::￿`)
          const all = await tx<VersionRecord[]>(STORE_VERSIONS, 'readonly', (s) =>
            s.getAll(range),
          )
          const autos = all
            .filter((r) => r.kind === 'auto')
            .sort((a, b) => a.created - b.created)
          const excess = autos.length - MAX_AUTO_VERSIONS
          for (let i = 0; i < excess; i++) {
            await tx(STORE_VERSIONS, 'readwrite', (s) =>
              s.delete(`${id}::${autos[i].versionId}`),
            )
          }
        } catch (err) {
          // Pruning is best-effort — the snapshot already succeeded.
          console.warn('[indexedDBAdapter] version prune failed:', err)
        }
      }
      return { ok: true }
    },
  }

  return adapter
}
