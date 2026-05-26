import { useEditor } from '@craftjs/core'
import { useEffect, useState } from 'react'
import { alignmentMatches, pickGuideMatches } from './alignmentMath'
import type { AlignmentMatch, SiblingRect } from './alignmentMath'

// Phase 11 § 3.6 — alignment-guide tracker.
//
// Craft.js uses HTML5 drag-and-drop. During a drag:
//   - The source element stays put visually (the browser renders a
//     "drag image" ghost).
//   - dragover fires on drop targets continuously.
//   - On drop / dragend, Craft commits via actions.move(id, parent,
//     index) — insertion-index based.
//
// What we do here:
//   - Subscribe to Craft's events.dragged to learn which node is
//     being dragged.
//   - Listen to document-level dragover to get the pointer's current
//     {x, y}.
//   - Resolve the dragged node's DOM rect + its siblings (same parent
//     canvas) — these are the rects on the canvas right now. Because
//     Craft doesn't actually move the source during drag, our
//     "dragged rect" is the source's CURRENT position offset by the
//     pointer delta (a rough proxy for where the user is dragging to).
//   - Run alignmentMatches against siblings → pickGuideMatches → up
//     to two visible guide lines.
//
// Modifier opt-out: when the user is holding Alt, matches are
// suppressed (pure free-drag, no alignment hints).
//
// Multi-canvas slot scope: when the dragged node lives inside a
// Pattern B multi-canvas slot (Card sub-region, Tabs content), each
// slot has its own coordinate space and snapping cross-region would
// be confusing. Guides are suppressed for those.

/**
 * Returns the currently-active alignment guides, or null when no
 * drag is in flight (or the modifier / slot restrictions bypass).
 *
 * Mounted once at editor scope via a host component.
 */
export function useDragGuides(): AlignmentMatch[] | null {
  const { draggedId, query } = useEditor((state) => {
    const ids = state.events.dragged
      ? Array.from(state.events.dragged)
      : []
    return { draggedId: (ids[0] as string | undefined) ?? null }
  })

  // Resolved guides at the current pointer position. Refreshed on
  // every dragover; cleared on dragend.
  const [guides, setGuides] = useState<AlignmentMatch[] | null>(null)

  useEffect(() => {
    if (!draggedId) {
      setGuides(null)
      return
    }

    // Resolve the dragged node + its parent + siblings up front. The
    // tree shape is stable during a drag (Craft doesn't move the
    // node until dragend), so we can cache.
    let draggedDom: HTMLElement | null
    let parentId: string | null
    let siblingDoms: Array<{ id: string; dom: HTMLElement }> = []
    try {
      const draggedNode = query.node(draggedId).get()
      draggedDom = (draggedNode.dom as HTMLElement) ?? null
      parentId = (draggedNode.data.parent as string | null) ?? null
      if (parentId) {
        const parentNode = query.node(parentId).get()
        // Multi-canvas-slot scope check: if the parent is a LINKED
        // node (Pattern B slot), suppress guides for this drag.
        // Linked nodes have an alphanumeric data type that matches a
        // canonical's canvas-slot id pattern; the simplest signal is
        // that the parent's id appears in some ancestor's
        // linkedNodes map. We approximate by: a node is a slot if
        // its OWN parent's data.linkedNodes contains parentId.
        const grandparentId = parentNode.data.parent as string | null
        let isInsideSlot = false
        if (grandparentId) {
          try {
            const gp = query.node(grandparentId).get()
            const linked = (gp.data.linkedNodes ??
              {}) as Record<string, string>
            if (Object.values(linked).includes(parentId)) {
              isInsideSlot = true
            }
          } catch {
            // Grandparent missing — treat as not-in-slot (safer).
          }
        }
        if (isInsideSlot) {
          // No guides inside multi-canvas slots.
          return
        }
        const siblingIds = ((parentNode.data.nodes as string[]) ?? []).filter(
          (id) => id !== draggedId,
        )
        siblingDoms = siblingIds
          .map((id) => {
            try {
              const dom = query.node(id).get().dom as HTMLElement | null
              return dom ? { id, dom } : null
            } catch {
              return null
            }
          })
          .filter((x): x is { id: string; dom: HTMLElement } => x !== null)
      }
    } catch {
      return
    }
    if (!draggedDom || siblingDoms.length === 0 || !parentId) {
      // No siblings to align against (or the node itself vanished).
      return
    }

    // Capture the source's resting rect. We'll project the dragged
    // bbox to (pointer.x, pointer.y) by offsetting from the original
    // mousedown position; for the visual-only-v1 we approximate by
    // using the pointer as the dragged-node centre. The guide lines
    // assist the user's eye even without a true coordinate snap.
    const sourceRect = draggedDom.getBoundingClientRect()
    const halfW = sourceRect.width / 2
    const halfH = sourceRect.height / 2

    const handler = (e: DragEvent) => {
      // Alt opt-out — pure free-drag, no guides.
      if (e.altKey) {
        setGuides(null)
        return
      }
      // Build the "dragged rect" centred on the current pointer.
      const x = e.clientX
      const y = e.clientY
      const draggedRect = {
        left: x - halfW,
        top: y - halfH,
        right: x + halfW,
        bottom: y + halfH,
      }
      const siblingRects: SiblingRect[] = siblingDoms.map(({ id, dom }) => {
        const r = dom.getBoundingClientRect()
        return {
          id,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
        }
      })
      const matches = alignmentMatches(draggedRect, siblingRects, 4)
      const picked = pickGuideMatches(matches)
      setGuides(picked.length > 0 ? picked : null)
    }

    document.addEventListener('dragover', handler)
    return () => {
      document.removeEventListener('dragover', handler)
      setGuides(null)
    }
  }, [draggedId, query])

  return guides
}
