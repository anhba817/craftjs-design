import { useEditor } from '@craftjs/core'
import { useCallback } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { cloneNodeTree } from './cloneNodeTree'

// Phase 11 § 3.2 — copy / paste / cut / duplicate primitives.
//
// Built on top of Craft.js's query.node(id).toNodeTree() + cloneNodeTree
// for id remapping. The "clipboard" lives in editorStore (in-memory,
// per-tab) rather than the system clipboard — the browser's
// navigator.clipboard.* APIs gate on user gestures and tab focus in
// ways that make Cmd+C / Cmd+V brittle. The internal clipboard handles
// the common single-tab case; cross-tab paste is a Phase 12+ stretch.
//
// Paste destination logic mirrors Toolbox's keyboard-add (§ 1.5):
//   - no selection → child of ROOT
//   - canvas selection → child of the selected canvas
//   - non-canvas selection → sibling AFTER the selected node
//
// Duplicate is copy + paste in a single throttled-history step so undo
// rolls it back as one action.

interface NodeTreeShape {
  rootNodeId: string
  nodes: Record<string, { data: { parent: string | null; nodes: string[]; linkedNodes: Record<string, string> } }>
}

type CraftActions = ReturnType<typeof useEditor>['actions']
type CraftQuery = ReturnType<typeof useEditor>['query']

/**
 * Returns the parent id + index where a paste should land, given the
 * current selection. Mirrors the Toolbox keyboard-add logic.
 */
export function computePasteTarget(
  query: CraftQuery,
): { parentId: string; index: number | undefined } {
  const selectedIds = query.getEvent('selected').all()
  const selectedId = selectedIds[0]
  if (!selectedId) {
    return { parentId: 'ROOT', index: undefined }
  }
  const selectedNode = query.node(selectedId).get()
  if (selectedNode.data.isCanvas) {
    return { parentId: selectedId, index: undefined }
  }
  const parentId = selectedNode.data.parent ?? 'ROOT'
  const parent = query.node(parentId).get()
  const siblings = parent.data.nodes ?? []
  const sibIdx = siblings.indexOf(selectedId)
  return {
    parentId,
    index: sibIdx >= 0 ? sibIdx + 1 : undefined,
  }
}

/**
 * Hook exposing the four clipboard actions. Identity is stable across
 * renders so consumers (global keydown listener, context menu items)
 * don't need useCallback indirection at their call sites.
 */
export function useClipboardActions() {
  const { actions, query } = useEditor()
  const setClipboard = useEditorStore((s) => s.setClipboard)
  const getClipboard = useEditorStore.getState

  const copy = useCallback(
    (nodeId: string) => {
      if (nodeId === 'ROOT') return // can't copy the root canvas itself
      const tree = query.node(nodeId).toNodeTree()
      setClipboard(tree)
    },
    [query, setClipboard],
  )

  const paste = useCallback(() => {
    const tree = getClipboard().clipboard as NodeTreeShape | null
    if (!tree) return
    const cloned = cloneNodeTree(tree)
    const { parentId, index } = computePasteTarget(query)
    // Cast to satisfy Craft's NodeTree shape — cloneNodeTree preserves
    // every field Craft cares about; the typing is just narrower than
    // Craft's full Node type to keep the helper testable.
    ;(actions as CraftActions).addNodeTree(
      cloned as unknown as Parameters<CraftActions['addNodeTree']>[0],
      parentId,
      index,
    )
  }, [actions, query, getClipboard])

  const cut = useCallback(
    (nodeId: string) => {
      if (nodeId === 'ROOT') return
      copy(nodeId)
      actions.delete(nodeId)
    },
    [actions, copy],
  )

  const duplicate = useCallback(
    (nodeId: string) => {
      if (nodeId === 'ROOT') return
      const tree = query.node(nodeId).toNodeTree() as unknown as NodeTreeShape
      const cloned = cloneNodeTree(tree)
      // Drop the clone next to the source: source's parent + source-index + 1.
      const sourceNode = query.node(nodeId).get()
      const parentId = sourceNode.data.parent ?? 'ROOT'
      const parent = query.node(parentId).get()
      const siblings = parent.data.nodes ?? []
      const sibIdx = siblings.indexOf(nodeId)
      ;(actions as CraftActions).addNodeTree(
        cloned as unknown as Parameters<CraftActions['addNodeTree']>[0],
        parentId,
        sibIdx >= 0 ? sibIdx + 1 : undefined,
      )
    },
    [actions, query],
  )

  return { copy, cut, paste, duplicate }
}
