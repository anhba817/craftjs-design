import { create } from 'zustand'
import { useEditorStore } from '@/state/editorStore'
import type { StorageSaveFailedInfo } from '@/state/editorStore'
import {
  type DocumentIndex,
  type DocumentSummary,
  type WriteResult,
  deleteDocumentBlob,
  getStorageUsage,
  migrateLegacyV1,
  newDocumentId,
  readDocument,
  readDocumentIndex,
  writeDocument,
  writeDocumentIndex,
} from './documentRegistry'
import type { EditorDocument } from './schema'

// Phase 9 § 1.7 — after every write, report usage to editorStore so
// StorageQuotaBanner / Modal reflect the current state. Quota failures
// raise the save-failed modal; other failures are already logged inside
// documentRegistry.
function reportWrite(
  operation: StorageSaveFailedInfo['operation'],
  result: WriteResult,
  docId?: string,
): void {
  if (result.ok === false && result.kind === 'quota') {
    useEditorStore.getState().setStorageSaveFailed({ operation, docId })
  }
  // Always refresh the percent so the banner threshold tracking matches
  // reality — usage can drop after a delete, for instance.
  const usage = getStorageUsage()
  useEditorStore.getState().setStorageQuotaPercent(usage.percent)
}

// Phase 7 multi-document store. Thin Zustand wrapper over documentRegistry —
// the registry handles localStorage; this store provides reactive subscription
// for the UI layer (SaveLoadBar, the upcoming DocumentMenu in Group E).
//
// The v1 → v2 migration runs at module load. If there's a legacy single-doc
// at `craftjs-design:doc:v1` and v2 is empty, it becomes the first entry in
// the v2 index named "Untitled".

interface DocumentStoreState extends DocumentIndex {
  setActiveId(id: string): void
  createDocument(name: string, seed?: EditorDocument): string
  renameDocument(id: string, name: string): void
  duplicateDocument(id: string): string
  deleteDocument(id: string): void
  saveActiveDocument(doc: EditorDocument): void
  loadActiveDocument(): EditorDocument | null
  // Phase 9 § 1.8 — when a sibling tab modifies the doc-index, re-read
  // localStorage into this store WITHOUT writing anything back. The
  // alternative — calling setActiveId / writeDocumentIndex — would
  // bounce the changed event back as a storage event in the other tab.
  reloadIndexFromStorage(): void
}

function initialState(): DocumentIndex {
  // Migrate v1 first if needed; otherwise just read the current v2 state.
  return migrateLegacyV1() ?? readDocumentIndex()
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  ...initialState(),

  setActiveId(id) {
    if (id === get().activeId) return
    const next: DocumentIndex = {
      documents: get().documents,
      activeId: id,
    }
    reportWrite('writeDocumentIndex', writeDocumentIndex(next))
    set(next)
  },

  createDocument(name, seed) {
    const id = newDocumentId()
    const now = Date.now()
    const summary: DocumentSummary = {
      id,
      name,
      created: now,
      updated: now,
    }
    if (seed) reportWrite('writeDocument', writeDocument(id, seed), id)
    const next: DocumentIndex = {
      documents: [...get().documents, summary],
      activeId: id,
    }
    reportWrite('writeDocumentIndex', writeDocumentIndex(next))
    set(next)
    return id
  },

  renameDocument(id, name) {
    const documents = get().documents.map((d) =>
      d.id === id ? { ...d, name, updated: Date.now() } : d,
    )
    const next: DocumentIndex = {
      documents,
      activeId: get().activeId,
    }
    reportWrite('writeDocumentIndex', writeDocumentIndex(next))
    set(next)
  },

  duplicateDocument(id) {
    const original = readDocument(id)
    if (!original) throw new Error(`document not found: ${id}`)
    const sourceSummary = get().documents.find((d) => d.id === id)
    const newName = sourceSummary ? `${sourceSummary.name} copy` : 'Untitled copy'
    return get().createDocument(newName, original)
  },

  deleteDocument(id) {
    deleteDocumentBlob(id)
    const documents = get().documents.filter((d) => d.id !== id)
    // If the deleted doc was active, fall back to the first remaining doc
    // (if any). Null when the user deletes their last document — the editor
    // shows the Frame's seed in that state.
    const activeId =
      get().activeId === id ? (documents[0]?.id ?? null) : get().activeId
    const next: DocumentIndex = { documents, activeId }
    reportWrite('writeDocumentIndex', writeDocumentIndex(next))
    set(next)
    // Delete frees space → percent may have dropped. reportWrite already
    // refreshed it, so the banner reflects the new usage automatically.
  },

  saveActiveDocument(doc) {
    let activeId = get().activeId
    let documents = get().documents
    if (!activeId) {
      // Auto-create the active document on first save. Group E's UI lets users
      // rename or pre-create explicitly; this path covers fresh editors that
      // hit Save before opening the document menu.
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
    reportWrite('writeDocument', writeDocument(activeId, doc), activeId)
    const next: DocumentIndex = { documents, activeId }
    reportWrite('writeDocumentIndex', writeDocumentIndex(next))
    set(next)
  },

  loadActiveDocument() {
    const activeId = get().activeId
    if (!activeId) return null
    return readDocument(activeId)
  },

  reloadIndexFromStorage() {
    const next = readDocumentIndex()
    set({ documents: next.documents, activeId: next.activeId })
  },
}))
