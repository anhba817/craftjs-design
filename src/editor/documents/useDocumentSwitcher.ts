import { useEditor } from '@craftjs/core'
import { useCallback } from 'react'
import { useDocumentStore } from '@/persistence/documentStore'
import type { EditorDocument } from '@/persistence/schema'
import { getTemplate } from '@/persistence/templates/registry'
import { useEditorStore } from '@/state/editorStore'

// Hook for runtime document switching. Hydrator handles the boot path; this
// handles every subsequent switch.
//
// The flow on switch:
//   1. Snapshot the CURRENT canvas via query.serialize() and saveActiveDocument
//      so unsaved changes don't get lost.
//   2. setActiveId(targetId) — flips the active pointer.
//   3. Load the target's blob (or fall back to the Empty template seed for
//      brand-new docs that never had a save).
//   4. actions.deserialize(...) — replaces Craft's tree.
//   5. Apply the doc's theme/adapter.
export function useDocumentSwitcher() {
  const { actions, query } = useEditor()

  const snapshotCurrent = useCallback((): EditorDocument => {
    const { activeThemeId, activeAdapterId } = useEditorStore.getState()
    return {
      version: 1,
      adapterId: activeAdapterId,
      themeId: activeThemeId,
      craftJson: query.serialize(),
    }
  }, [query])

  const applyEnvelope = useCallback(
    (doc: EditorDocument) => {
      actions.deserialize(doc.craftJson)
      const store = useEditorStore.getState()
      if (doc.themeId) store.setActiveTheme(doc.themeId)
      store.setActiveAdapter(doc.adapterId)
    },
    [actions],
  )

  const switchTo = useCallback(
    (targetId: string) => {
      const store = useDocumentStore.getState()
      if (store.activeId === targetId) return

      // Snapshot the current doc only if there IS an active doc to save into.
      // Brand-new editors (activeId=null) have nothing to save — their canvas
      // is just the Frame's default seed.
      if (store.activeId) {
        store.saveActiveDocument(snapshotCurrent())
      }

      store.setActiveId(targetId)
      const loaded = store.loadActiveDocument()
      if (loaded) {
        applyEnvelope(loaded)
        return
      }
      // Target document has no blob yet (created but never saved). Seed from
      // the Empty template so the canvas resets cleanly.
      const empty = getTemplate('empty')
      if (empty) applyEnvelope(empty.envelope)
    },
    [snapshotCurrent, applyEnvelope],
  )

  const createBlank = useCallback(
    (name: string) => {
      const store = useDocumentStore.getState()
      if (store.activeId) {
        store.saveActiveDocument(snapshotCurrent())
      }
      const empty = getTemplate('empty')
      const newId = store.createDocument(name, empty?.envelope)
      if (empty) applyEnvelope(empty.envelope)
      return newId
    },
    [snapshotCurrent, applyEnvelope],
  )

  const createFromTemplate = useCallback(
    (templateId: string, name: string) => {
      const template = getTemplate(templateId)
      if (!template) {
        throw new Error(`template not found: ${templateId}`)
      }
      const store = useDocumentStore.getState()
      if (store.activeId) {
        store.saveActiveDocument(snapshotCurrent())
      }
      const newId = store.createDocument(name, template.envelope)
      applyEnvelope(template.envelope)
      return newId
    },
    [snapshotCurrent, applyEnvelope],
  )

  return { switchTo, createBlank, createFromTemplate }
}
