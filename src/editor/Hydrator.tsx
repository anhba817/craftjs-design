import { useEditor } from '@craftjs/core'
import { useEffect } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { loadDocument } from '@/persistence/storage'

// Module-level flag, not useRef. AdapterProvider's tree shape changes when the
// active adapter has a Wrapper (MUI) vs. not (shadcn), which unmounts and
// remounts everything inside it — including this component. A useRef would
// reset on remount and re-fire restore, snapping the user's adapter pick back
// to the persisted value. The module-level flag survives remount; survives
// dev HMR resets only by the cost of reloading the module (acceptable).
let hydrated = false

export function Hydrator() {
  const { actions } = useEditor()

  useEffect(() => {
    if (hydrated) return
    hydrated = true
    try {
      const doc = loadDocument()
      if (!doc) return
      actions.deserialize(doc.craftJson)
      const store = useEditorStore.getState()
      if (doc.themeId) store.setActiveTheme(doc.themeId)
      store.setActiveAdapter(doc.adapterId)
    } catch (err) {
      // Corrupt or stale localStorage shouldn't brick boot — log and start fresh.
      console.error('[Hydrator] failed to load saved document:', err)
    }
  }, [actions])

  return null
}
