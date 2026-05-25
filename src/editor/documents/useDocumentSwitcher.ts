import { useEditor } from '@craftjs/core'
import { useCallback } from 'react'
import { useDocumentStore } from '@/persistence/documentStore'
import type { EditorDocument } from '@/persistence/schema'
import { getTemplate } from '@/persistence/templates/registry'
import { useEditorStore } from '@/state/editorStore'
import { applyEnvelopeSafely } from '@/editor/errors/applyEnvelopeSafely'

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

  // Routes through applyEnvelopeSafely so an integrity failure or a thrown
  // deserialize sets the malformedDocument state — Editor.tsx swaps the
  // canvas Frame for MalformedDocumentBanner. See Phase 9 § 1.9.
  const applyEnvelope = useCallback(
    (docId: string, doc: EditorDocument) => {
      applyEnvelopeSafely(actions, docId, doc)
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
        applyEnvelope(targetId, loaded)
        return
      }
      // Target document has no blob yet (created but never saved). Seed from
      // the Empty template so the canvas resets cleanly.
      const empty = getTemplate('empty')
      if (empty) applyEnvelope(targetId, empty.envelope)
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
      if (empty) applyEnvelope(newId, empty.envelope)
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
      applyEnvelope(newId, template.envelope)
      return newId
    },
    [snapshotCurrent, applyEnvelope],
  )

  return { switchTo, createBlank, createFromTemplate }
}
