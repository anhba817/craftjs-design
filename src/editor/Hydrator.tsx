import { useEditor } from '@craftjs/core'
import { useEffect } from 'react'
import { useDocumentStore } from '@/persistence/documentStore'
import {
  clearSharedFragment,
  decodeDocument,
  readSharedFragment,
} from '@/persistence/share'
import type { EditorDocument } from '@/persistence/schema'
import { applyEnvelopeSafely } from './errors/applyEnvelopeSafely'

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
    // Shared URL fragment takes precedence over local state — opening a
    // shared link creates a new document and makes it active. The previous
    // active document is preserved in the index, just no longer active.
    const sharedDoc = loadFromSharedFragment()
    if (sharedDoc) {
      // createDocument returns the new id; use it for malformed-state
      // archive scoping if the shared envelope turns out to be broken.
      const newId = useDocumentStore
        .getState()
        .createDocument('Shared document', sharedDoc)
      applyEnvelopeSafely(actions, newId, sharedDoc)
      clearSharedFragment()
      return
    }

    const doc = useDocumentStore.getState().loadActiveDocument()
    if (!doc) return
    const activeId = useDocumentStore.getState().activeId ?? 'unknown'
    applyEnvelopeSafely(actions, activeId, doc)
  }, [actions])

  return null
}

function loadFromSharedFragment(): EditorDocument | null {
  if (typeof window === 'undefined') return null
  const encoded = readSharedFragment(window.location.hash)
  if (!encoded) return null
  try {
    return decodeDocument(encoded)
  } catch (err) {
    console.warn('[Hydrator] shared fragment decode failed:', err)
    return null
  }
}
