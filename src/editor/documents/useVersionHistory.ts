import { useEditor } from '@craftjs/core'
import { useCallback } from 'react'
import { useDocumentStore } from '@/persistence/documentStore'
import {
  CURRENT_DOCUMENT_VERSION,
  type EditorDocument,
} from '@/persistence/schema'
import type { DocumentVersion } from '@/persistence/types'
import { useEditorStore } from '@/state/editorStore'
import { applyEnvelopeSafely } from '@/editor/errors/applyEnvelopeSafely'

// Phase 14 § 6.3 — version history actions. `restore` snapshots the
// current canvas first (so restoring is itself undoable via the version
// list) before applying the chosen version; `saveNamed` writes a labeled
// manual save point. `list` reads the current document's versions.
export function useVersionHistory() {
  const { actions, query } = useEditor()

  const snapshotCurrent = useCallback((): EditorDocument => {
    const { activeThemeId, activeAdapterId, colorMode } =
      useEditorStore.getState()
    return {
      version: CURRENT_DOCUMENT_VERSION,
      adapterId: activeAdapterId,
      themeId: activeThemeId,
      colorMode,
      craftJson: query.serialize(),
    }
  }, [query])

  const list = useCallback((): Promise<DocumentVersion[]> => {
    return useDocumentStore.getState().listVersions()
  }, [])

  const saveNamed = useCallback(
    async (label: string): Promise<void> => {
      await useDocumentStore.getState().saveNamedVersion(snapshotCurrent(), label)
    },
    [snapshotCurrent],
  )

  const restore = useCallback(
    async (versionId: string): Promise<void> => {
      const store = useDocumentStore.getState()
      // Snapshot current state first so the restore can itself be undone
      // from the version list.
      await store.saveActiveDocument(snapshotCurrent())
      const doc = await store.readVersion(versionId)
      if (!doc) return
      applyEnvelopeSafely(actions, store.activeId ?? 'unknown', doc)
    },
    [actions, snapshotCurrent],
  )

  const supported = useDocumentStore.getState().versioningSupported()

  return { list, saveNamed, restore, supported }
}
