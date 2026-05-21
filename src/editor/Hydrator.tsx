import { useEditor } from '@craftjs/core'
import { useEffect } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { loadDocument } from '@/persistence/storage'

export function Hydrator() {
  const { actions } = useEditor()

  useEffect(() => {
    try {
      const doc = loadDocument()
      if (!doc) return
      actions.deserialize(doc.craftJson)
      if (doc.themeId) {
        useEditorStore.getState().setActiveTheme(doc.themeId)
      }
    } catch (err) {
      // Corrupt or stale localStorage shouldn't brick boot — log and start fresh.
      console.error('[Hydrator] failed to load saved document:', err)
    }
  }, [actions])

  return null
}
