import { useEditor } from '@craftjs/core'
import { useEffect } from 'react'
import { useEditorStore } from '../../state/editorStore'
import { extendRange, toggleId } from './modifierSelection'

// Phase 11 § 3.3 — capture-phase mousedown listener that implements
// modifier-click selection semantics BEFORE Craft.js's default
// connector handler runs.
//
// How this beats Craft's default selection: Craft's connector adds
// a bubble-phase mousedown listener on each node DOM via
// addEventListener (no { capture: true }). We attach a
// capture-phase listener on document — it runs first. If a modifier
// (Cmd / Ctrl / Shift) is present, we handle the selection update
// ourselves, then call event.stopPropagation() so Craft's listener
// never fires and doesn't overwrite our multi-selection with a
// single-id selectNode().
//
// Without modifiers, we don't touch the event — Craft's default
// (single-select via the connector) runs and useSelectionSync mirrors
// the result into editorStore.selection.
//
// The handler also calls actions.selectNode(primary) after a
// modifier-click so Craft's events.selected stays in sync with
// editorStore.selection[0] — that way the ResizeOverlay, the
// NodeContextMenu, and CanvasKeyboardRegion (all of which read
// Craft's selection) operate on a consistent "primary" node.

export function useMultiSelectClick(): void {
  const { query, actions } = useEditor()

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      // Only the primary button counts for selection — right-click is
      // handled by NodeContextMenu's onContextMenu, middle-click is
      // ignored.
      if (event.button !== 0) return

      const hasShift = event.shiftKey
      const hasMeta = event.metaKey || event.ctrlKey
      if (!hasShift && !hasMeta) return

      const startEl = event.target as HTMLElement | null
      if (!startEl) return
      const nodeEl = startEl.closest(
        '[data-craft-node-id]',
      ) as HTMLElement | null
      if (!nodeEl) return
      const targetId = nodeEl.getAttribute('data-craft-node-id')
      if (!targetId) return

      // Don't allow selection of ROOT via modifier-click — including
      // ROOT in a multi-selection breaks delete (ROOT can't be
      // removed) and breaks wrap. Modifier-click on ROOT is a no-op;
      // the user can still left-click ROOT to clear-then-select.
      try {
        if (query.node(targetId).isRoot()) return
      } catch {
        // Node was just removed (race with rapid undo/redo). Ignore.
        return
      }

      const store = useEditorStore.getState()
      const current = store.selection
      let next: string[]

      if (hasShift) {
        // Range extension within target's parent. Cross-parent ranges
        // are confusing, so we keep cross-parent extras but only
        // extend within target's sibling group.
        let siblings: readonly string[] = []
        try {
          const targetNode = query.node(targetId).get()
          const parentId = targetNode.data.parent
          if (parentId) {
            const parentNode = query.node(parentId).get()
            siblings = parentNode.data.nodes ?? []
          }
        } catch {
          return
        }
        if (siblings.length === 0) {
          next = toggleId(current, targetId)
        } else {
          next = extendRange(current, targetId, siblings)
        }
      } else {
        // hasMeta — Cmd/Ctrl toggle.
        next = toggleId(current, targetId)
      }

      // Suppress Craft's default selection: its bubble-phase mousedown
      // listener would otherwise overwrite events.selected with a
      // single-id set, which useSelectionSync would then mirror back,
      // collapsing our multi-selection.
      event.stopPropagation()
      event.preventDefault()

      store.setSelection(next)

      // Keep Craft's primary in sync with selection[0] so the
      // ResizeOverlay / context menu / keyboard nav read a consistent
      // value. If next is empty (user just toggled OFF the last id),
      // clear Craft's selection too.
      const primary = next[0]
      if (primary) {
        actions.selectNode(primary)
      } else {
        actions.selectNode()
      }
    }

    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [query, actions])
}
