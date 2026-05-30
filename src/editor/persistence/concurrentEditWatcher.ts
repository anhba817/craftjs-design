import { useEffect } from 'react'
import {
  type DocBroadcastMessage,
  subscribeDocBroadcast,
} from '@/persistence/docBroadcast'
import { useDocumentStore } from '@/persistence/documentStore'
import { getStorageAdapter } from '@/persistence/storageAdapter'
import { useEditorStore } from '@/state/editorStore'

// Phase 14 § 6.2 — cross-tab edit watcher over BroadcastChannel.
//
// (Was Phase 9 § 1.8 over the localStorage `storage` event; the event is
// localStorage-only and goes silent once the backend is IndexedDB, so the
// transport moved to BroadcastChannel — see docBroadcast.ts.)
//
// Two cases, mirroring the old behavior:
//   - index-changed — another tab created / renamed / deleted a document
//     or changed the active pointer. Re-read the index into the local
//     store so the document menu reflects it.
//   - doc-changed for the ACTIVE doc — another tab saved over the document
//     we're editing. Read the remote envelope via the adapter and surface
//     it through setConcurrentEditConflict; the banner lets the user pick
//     whose version wins. doc-changed for an inactive doc is ignored —
//     switching to it later reads the freshest version naturally.
//
// BroadcastChannel doesn't echo a message back to the posting tab, so we
// never react to our own writes.

export type BroadcastDecision =
  | { action: 'ignore' }
  | { action: 'reload-index' }
  | { action: 'check-conflict'; docId: string }

// Pure decision helper — message + active id → what the caller should do.
// The remote-envelope read is async (adapter) so it lives in the effect,
// not here; this stays synchronously testable.
export function decideBroadcast(
  message: DocBroadcastMessage,
  activeId: string | null,
): BroadcastDecision {
  if (message.type === 'index-changed') return { action: 'reload-index' }
  // doc-changed
  if (!activeId || message.docId !== activeId) return { action: 'ignore' }
  return { action: 'check-conflict', docId: activeId }
}

export function useConcurrentEditWatcher(): void {
  useEffect(() => {
    return subscribeDocBroadcast((message) => {
      const activeId = useDocumentStore.getState().activeId
      const decision = decideBroadcast(message, activeId)
      switch (decision.action) {
        case 'ignore':
          return
        case 'reload-index':
          void useDocumentStore.getState().reloadIndexFromStorage()
          return
        case 'check-conflict':
          void getStorageAdapter()
            .readDocument(decision.docId)
            .then((remoteEnvelope) => {
              if (!remoteEnvelope) return
              useEditorStore.getState().setConcurrentEditConflict({
                docId: decision.docId,
                remoteEnvelope,
              })
            })
          return
      }
    })
  }, [])
}
