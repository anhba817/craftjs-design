import { useEditor } from '@craftjs/core'
import { useEffect } from 'react'
import { loadDocument } from '../persistence/storage'

export function Hydrator() {
  const { actions } = useEditor()

  useEffect(() => {
    try {
      const doc = loadDocument()
      if (doc) actions.deserialize(doc.craftJson)
    } catch (err) {
      // Corrupt or stale localStorage shouldn't brick boot — log and start fresh.
      console.error('[Hydrator] failed to load saved document:', err)
    }
  }, [actions])

  return null
}
