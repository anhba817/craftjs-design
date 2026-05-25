import { useEffect } from 'react'
import {
  STORAGE_KEY_INDEX,
  storageKeyForDocument,
} from '@/persistence/documentRegistry'
import { useDocumentStore } from '@/persistence/documentStore'
import { documentSchema } from '@/persistence/schema'
import { useEditorStore } from '@/state/editorStore'

// Phase 9 § 1.8 — listens for cross-tab localStorage edits and routes
// them into editorStore.concurrentEditConflict / documentStore. The
// `storage` event only fires for writes from OTHER tabs (the spec
// excludes the originating tab), so this handler can assume any event
// it sees represents an external change.
//
// Three cases:
//   - Index changed (STORAGE_KEY_INDEX) — another tab created /
//     renamed / deleted a document, or changed activeId. Re-read the
//     index into the local store so the document menu reflects it.
//   - Active doc's blob changed and parses cleanly — surface the
//     remote envelope via setConcurrentEditConflict. The banner lets
//     the user pick whose version wins.
//   - Active doc's blob changed but doesn't parse (corrupt write) —
//     ignored; the other tab will surface its own MalformedDocument
//     state when it tries to read.
//
// Inactive-doc edits are also ignored — switching to that doc later
// reads the freshest version naturally via Hydrator /
// useDocumentSwitcher.

// Pure helper so the storage-event logic can be tested without a React
// host. Exported for vitest. Returns one of:
//   - { action: 'ignore' } — event isn't relevant to us
//   - { action: 'reload-index' } — caller should call reloadIndexFromStorage
//   - { action: 'conflict', docId, remoteEnvelope } — caller should set
//     the editorStore conflict state
//   - { action: 'remote-deleted', docId } — the active doc was deleted
//     from the index in another tab; current implementation falls
//     under 'reload-index' because the index change triggers its own
//     storage event when the other tab also rewrites the index.
export type StorageEventDecision =
  | { action: 'ignore' }
  | { action: 'reload-index' }
  | {
      action: 'conflict'
      docId: string
      remoteEnvelope: ReturnType<typeof documentSchema.parse>
    }

export function decideStorageEvent(
  event: { key: string | null; newValue: string | null },
  activeId: string | null,
): StorageEventDecision {
  const { key, newValue } = event
  if (!key) return { action: 'ignore' }
  if (key === STORAGE_KEY_INDEX) return { action: 'reload-index' }
  if (!activeId) return { action: 'ignore' }
  if (key !== storageKeyForDocument(activeId)) return { action: 'ignore' }
  if (!newValue) {
    // The doc blob was removed (delete from another tab). The other tab
    // will also rewrite the index, which fires a separate storage event
    // we already handle. Treat blob-only removal as ignorable.
    return { action: 'ignore' }
  }
  try {
    const parsed = documentSchema.parse(JSON.parse(newValue))
    return { action: 'conflict', docId: activeId, remoteEnvelope: parsed }
  } catch {
    // Corrupt remote write — the other tab will surface its own
    // MalformedDocumentBanner when it tries to read. Don't propagate
    // the corruption here.
    return { action: 'ignore' }
  }
}

export function useConcurrentEditWatcher(): void {
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      const activeId = useDocumentStore.getState().activeId
      const decision = decideStorageEvent(
        { key: event.key, newValue: event.newValue },
        activeId,
      )
      switch (decision.action) {
        case 'ignore':
          return
        case 'reload-index':
          useDocumentStore.getState().reloadIndexFromStorage()
          return
        case 'conflict':
          useEditorStore.getState().setConcurrentEditConflict({
            docId: decision.docId,
            remoteEnvelope: decision.remoteEnvelope,
          })
          return
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
}
