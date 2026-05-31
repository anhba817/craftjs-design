import { create } from 'zustand'
import { useEditorStore } from '@/state/editorStore'
import type { StorageSaveFailedInfo } from '@/state/editorStore'
import { emitMetric } from '@/editor/telemetry/telemetry'
import { postDocBroadcast } from './docBroadcast'
import { newDocumentId } from './documentRegistry'
import { getStorageAdapter } from './storageAdapter'
import type {
  DocumentIndex,
  DocumentSummary,
  DocumentVersion,
  WriteResult,
} from './types'
import type { EditorDocument } from './schema'

// Phase 14 § 6.2 — multi-document store over the async StorageAdapter seam.
//
// The INDEX ({documents[], activeId}) is held in synchronous Zustand state
// so the UI (DocumentMenu, SaveLoadBar) subscribes the usual way. Index
// mutations update that state optimistically and persist via the adapter
// in the background — so create / rename / delete / setActiveId keep their
// synchronous return values. Document BLOBS are read/written through the
// adapter and are genuinely async: `loadActiveDocument`, `duplicateDocument`
// (reads the source blob) and `saveActiveDocument` return Promises.
//
// `ready` is false until `bootstrap()` resolves the first index read. The
// editor shell shows a loading state until then; Hydrator waits for it.

// Quota failures raise the save-failed modal (handled synchronously from
// the WriteResult); other failures are already logged inside the adapter.
function handleWriteResult(
  operation: StorageSaveFailedInfo['operation'],
  result: WriteResult,
  docId?: string,
): void {
  if (result.ok === false && result.kind === 'quota') {
    useEditorStore.getState().setStorageSaveFailed({ operation, docId })
  }
}

// Refresh the storage-usage percent so the quota banner tracks reality
// (usage can drop after a delete). Async because the adapter's estimate
// may hit navigator.storage.estimate() / a remote call.
async function refreshUsage(): Promise<void> {
  try {
    const usage = await getStorageAdapter().estimateUsage()
    useEditorStore.getState().setStorageQuotaPercent(usage.percent)
  } catch {
    // Usage reporting is advisory — never let it break a write path.
  }
}

interface DocumentStoreState extends DocumentIndex {
  // False until bootstrap() resolves. The editor shell gates the canvas
  // on this so it doesn't hydrate against an empty pre-bootstrap index.
  ready: boolean

  bootstrap(): Promise<void>

  setActiveId(id: string): void
  createDocument(name: string, seed?: EditorDocument): string
  renameDocument(id: string, name: string): void
  duplicateDocument(id: string): Promise<string>
  deleteDocument(id: string): void
  saveActiveDocument(doc: EditorDocument): Promise<void>
  loadActiveDocument(): Promise<EditorDocument | null>
  // Phase 9 § 1.8 — a sibling tab changed the index; re-read it into this
  // store WITHOUT writing back (avoids a broadcast/storage echo loop).
  reloadIndexFromStorage(): Promise<void>

  // Phase 14 § 6.3 — version snapshots. No-ops / empty when the active
  // adapter doesn't implement the optional version methods (localStorage).
  versioningSupported(): boolean
  // Save the document as the active doc AND write a labeled manual
  // version (a "save point" exempt from ring-buffer eviction).
  saveNamedVersion(doc: EditorDocument, label: string): Promise<void>
  listVersions(): Promise<DocumentVersion[]>
  readVersion(versionId: string): Promise<EditorDocument | null>
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => {
  // Persist the index optimistically: update in-memory state now, write
  // through the adapter in the background, react to quota failures +
  // refresh usage when the write resolves.
  function persistIndex(next: DocumentIndex): void {
    set(next)
    void getStorageAdapter()
      .writeIndex(next)
      .then((r) => {
        handleWriteResult('writeDocumentIndex', r)
        // Tell other tabs to re-read the index (new / renamed / deleted
        // doc, or a changed active pointer).
        postDocBroadcast({ type: 'index-changed' })
        void refreshUsage()
      })
  }

  return {
    documents: [],
    activeId: null,
    ready: false,

    async bootstrap(): Promise<void> {
      const adapter = getStorageAdapter()
      const start = Date.now()
      try {
        await adapter.init?.()
        const index = await adapter.readIndex()
        set({
          documents: index.documents,
          activeId: index.activeId,
          ready: true,
        })
        // Phase 15 § 13.2 — opt-in perf metric (no-op without a handler).
        emitMetric({
          name: 'document.bootstrap',
          durationMs: Date.now() - start,
          documentCount: index.documents.length,
        })
      } catch (err) {
        console.error('[documentStore] bootstrap failed:', err)
        // Still mark ready so the editor renders (empty) instead of
        // hanging on the loading state forever.
        set({ ready: true })
      }
      void refreshUsage()
    },

    setActiveId(id) {
      if (id === get().activeId) return
      persistIndex({ documents: get().documents, activeId: id })
    },

    createDocument(name, seed) {
      const id = newDocumentId()
      const now = Date.now()
      const summary: DocumentSummary = { id, name, created: now, updated: now }
      if (seed) {
        void getStorageAdapter()
          .writeDocument(id, seed)
          .then((r) => {
            handleWriteResult('writeDocument', r, id)
            void refreshUsage()
          })
      }
      persistIndex({ documents: [...get().documents, summary], activeId: id })
      return id
    },

    renameDocument(id, name) {
      const documents = get().documents.map((d) =>
        d.id === id ? { ...d, name, updated: Date.now() } : d,
      )
      persistIndex({ documents, activeId: get().activeId })
    },

    async duplicateDocument(id) {
      const original = await getStorageAdapter().readDocument(id)
      if (!original) throw new Error(`document not found: ${id}`)
      const sourceSummary = get().documents.find((d) => d.id === id)
      const newName = sourceSummary
        ? `${sourceSummary.name} copy`
        : 'Untitled copy'
      return get().createDocument(newName, original)
    },

    deleteDocument(id) {
      void getStorageAdapter()
        .deleteDocument(id)
        .then(() => void refreshUsage())
      const documents = get().documents.filter((d) => d.id !== id)
      // If the deleted doc was active, fall back to the first remaining doc
      // (null when the user deletes their last document — the editor shows
      // the Frame's seed in that state).
      const activeId =
        get().activeId === id ? (documents[0]?.id ?? null) : get().activeId
      persistIndex({ documents, activeId })
    },

    async saveActiveDocument(doc) {
      let activeId = get().activeId
      let documents = get().documents
      if (!activeId) {
        // Auto-create the active document on first save (fresh editor that
        // hit Save before opening the document menu).
        activeId = newDocumentId()
        const now = Date.now()
        documents = [
          ...documents,
          { id: activeId, name: 'Untitled', created: now, updated: now },
        ]
      } else {
        documents = documents.map((d) =>
          d.id === activeId ? { ...d, updated: Date.now() } : d,
        )
      }
      const adapter = getStorageAdapter()
      const writeRes = await adapter.writeDocument(activeId, doc)
      handleWriteResult('writeDocument', writeRes, activeId)
      // Notify other tabs the active doc's blob changed (conflict check).
      postDocBroadcast({ type: 'doc-changed', docId: activeId })
      // Phase 14 § 6.3 — auto-snapshot on every save (ring-buffered in the
      // adapter). Fire-and-forget so the snapshot never blocks the save.
      if (writeRes.ok && adapter.writeVersion) {
        void adapter.writeVersion(activeId, doc, { kind: 'auto' })
      }
      persistIndex({ documents, activeId })
      await refreshUsage()
    },

    async loadActiveDocument() {
      const activeId = get().activeId
      if (!activeId) return null
      return getStorageAdapter().readDocument(activeId)
    },

    async reloadIndexFromStorage() {
      const next = await getStorageAdapter().readIndex()
      set({ documents: next.documents, activeId: next.activeId })
    },

    versioningSupported() {
      return typeof getStorageAdapter().writeVersion === 'function'
    },

    async saveNamedVersion(doc, label) {
      // Persist as the active document first (also fires an auto-snapshot),
      // then add the labeled manual save point.
      await get().saveActiveDocument(doc)
      const activeId = get().activeId
      const adapter = getStorageAdapter()
      if (activeId && adapter.writeVersion) {
        const res = await adapter.writeVersion(activeId, doc, {
          kind: 'manual',
          label,
        })
        handleWriteResult('writeDocument', res, activeId)
      }
    },

    async listVersions() {
      const activeId = get().activeId
      const adapter = getStorageAdapter()
      if (!activeId || !adapter.listVersions) return []
      return adapter.listVersions(activeId)
    },

    async readVersion(versionId) {
      const activeId = get().activeId
      const adapter = getStorageAdapter()
      if (!activeId || !adapter.readVersion) return null
      return adapter.readVersion(activeId, versionId)
    },
  }
})

// Kick off the first index read. Safe to call more than once — bootstrap
// just re-reads and re-sets. Called from the editor shell on mount.
export function bootstrapDocumentStore(): Promise<void> {
  return useDocumentStore.getState().bootstrap()
}
