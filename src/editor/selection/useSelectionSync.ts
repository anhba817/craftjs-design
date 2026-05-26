import { useEditor } from '@craftjs/core'
import { useEffect } from 'react'
import { useEditorStore } from '../../state/editorStore'

// Phase 11 § 3.3 — bridge from Craft's events.selected → editorStore.selection.
//
// Craft.js has its own selection state in events.selected (a Set<string>),
// fed by the default left-click connector, NodeContextMenu's right-click
// pre-selection, CanvasKeyboardRegion arrow keys, and other internal
// pathways. The editor needs a multi-id selection model with modifier-
// click semantics, which Craft's single-id selectNode() can't express.
//
// Strategy: editorStore.selection is the source of truth for the UI
// (Inspector, breadcrumbs, multi-delete). This hook listens to Craft's
// Set and mirrors single-id changes INTO editorStore — that way default
// connector / arrow-key / context-menu selections "just work" and
// reset the selection to a single id.
//
// The reverse direction (multi-id from modifier-click → Craft) happens
// in useMultiSelectClick: after toggling/extending the array, it calls
// actions.selectNode(selection[0]) so Craft's primary stays consistent
// with editorStore.selection[0]. Resize / context-menu always operate
// on the primary; multi-only operations (delete, wrap) read directly
// from editorStore.selection.
//
// Loop avoidance: we only write into editorStore when Craft's first
// selected id differs from editorStore.selection[0]. So Craft → store
// fires once; the store update doesn't trigger us again because the
// useEditor collector's returned id is value-equal.

export function useSelectionSync(): void {
  // Capture Craft's first-selected id. Multi-id in Craft's Set is rare
  // (only when an internal action populates it directly), and we
  // treat the FIRST as the canonical "Craft cursor" — modifier-click
  // mirrors selection[0] back, so this stays consistent.
  const { craftFirstId } = useEditor((state) => {
    const ids = state.events.selected ? Array.from(state.events.selected) : []
    return { craftFirstId: (ids[0] as string | undefined) ?? null }
  })

  useEffect(() => {
    const store = useEditorStore.getState()
    const current = store.selection

    if (craftFirstId === null) {
      if (current.length > 0) {
        store.clearSelection()
      }
      return
    }

    if (current[0] === craftFirstId) return

    store.setSelection([craftFirstId])
  }, [craftFirstId])
}
