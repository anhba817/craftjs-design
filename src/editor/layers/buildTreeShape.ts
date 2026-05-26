// Phase 11 § 3.4 — pure helper that flattens a Craft node tree into a
// DFS pre-order list suitable for rendering as the Layer Tree (or
// feeding into a virtualizer).
//
// The helper is decoupled from @craftjs/core via the NodeReader
// interface: any object that can resolve a node id to a displayName
// + children ids + linked-node entries works. The LayerTree component
// adapts Craft's query into this shape; tests use plain object
// mocks.
//
// Why a flat list instead of nested rendering: drag-reorder and
// keyboard navigation both need index-based access (move up/down
// across siblings, find the row directly above the cursor). A flat
// list is also what TanStack Virtual consumes.
//
// LinkedNodes (Pattern B canvas slots like Card's header / body /
// footer) are walked AFTER regular children at the same depth and
// tagged with the slot name. Designers expect to navigate into them
// from the tree the same way they navigate into Pattern A children.

export interface TreeNodeShape {
  /** Craft node id. ROOT for the canvas's root canvas node. */
  id: string
  /** Human-readable label (canonical's displayName). */
  displayName: string
  /** 0 for root, +1 per nesting step. Drives the indent. */
  depth: number
  /** null only for the root; every other node has a parent. */
  parentId: string | null
  /**
   * True when the node has at least one regular child OR one linked
   * node. The chevron-collapse affordance keys off this.
   */
  hasChildren: boolean
  /**
   * Pattern B: the parent's linkedNodes slot name this node occupies
   * (`'header'`, `'body'`, …). Undefined for Pattern A children and
   * for the root.
   */
  linkedSlot?: string
}

export interface NodeReader {
  getDisplayName(id: string): string
  getChildren(id: string): readonly string[]
  /**
   * Returns `{}` when the node has no linked slots. The keys are
   * slot names; values are the child node ids.
   */
  getLinkedNodes(id: string): Record<string, string>
}

/**
 * Flatten the tree rooted at `rootId` into DFS pre-order. Collapsed
 * ids stop recursion (their subtree is not included in the result),
 * but the collapsed node itself IS included so the row can render.
 *
 * Output order at each level:
 *   1. Regular children in their stored DOM order.
 *   2. Linked-node slots sorted alphabetically by slot name. Stable
 *      ordering across renders is the goal — Pattern B canonicals
 *      don't define a canonical slot order, so we pick one.
 */
export function buildTreeShape(
  reader: NodeReader,
  rootId: string,
  collapsed: ReadonlySet<string> = new Set(),
): TreeNodeShape[] {
  const result: TreeNodeShape[] = []
  // Cycle guard: a malformed envelope could in theory create a parent
  // cycle. Skip visited ids defensively rather than infinite-looping.
  const visited = new Set<string>()

  function visit(
    id: string,
    depth: number,
    parentId: string | null,
    linkedSlot?: string,
  ): void {
    if (visited.has(id)) return
    visited.add(id)

    const children = reader.getChildren(id)
    const linked = reader.getLinkedNodes(id)
    const linkedEntries = Object.entries(linked)
    const hasChildren = children.length > 0 || linkedEntries.length > 0

    result.push({
      id,
      displayName: reader.getDisplayName(id),
      depth,
      parentId,
      hasChildren,
      linkedSlot,
    })

    if (collapsed.has(id)) return

    for (const childId of children) {
      visit(childId, depth + 1, id)
    }
    for (const [slot, childId] of linkedEntries.sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      visit(childId, depth + 1, id, slot)
    }
  }

  visit(rootId, 0, null)
  return result
}

/**
 * Cycle check used by drag-reorder: would moving `draggedId` under
 * `targetParentId` create a cycle (target is itself a descendant of
 * the dragged node)?
 *
 * Walks descendants of `draggedId` until it finds `targetParentId`
 * or exhausts the subtree.
 */
export function wouldCreateCycle(
  reader: NodeReader,
  draggedId: string,
  targetParentId: string,
): boolean {
  if (draggedId === targetParentId) return true
  const queue: string[] = [...reader.getChildren(draggedId)]
  const linked = reader.getLinkedNodes(draggedId)
  for (const id of Object.values(linked)) queue.push(id)
  const seen = new Set<string>([draggedId])
  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur === targetParentId) return true
    if (seen.has(cur)) continue
    seen.add(cur)
    queue.push(...reader.getChildren(cur))
    for (const id of Object.values(reader.getLinkedNodes(cur))) {
      queue.push(id)
    }
  }
  return false
}
