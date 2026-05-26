// Phase 11 § 3.2 — clone a Craft.js node tree with fresh node ids.
//
// `query.node(id).toNodeTree()` returns the subtree as-is, with the
// SAME node ids. Pasting that tree back into the editor would create
// duplicate ids → Craft state corruption. cloneNodeTree walks the
// shape and re-keys every node, rewriting parent / nodes /
// linkedNodes references at the same time.
//
// Pure and dependency-free — easy to unit test against synthetic
// trees without spinning up Craft's editor instance.

// Minimal NodeTree shape — kept narrow on purpose. Craft's full Node
// type carries event flags, computed props, etc. that we don't need
// to inspect; we just preserve them verbatim during the rewrite.
interface NodeTreeShape {
  rootNodeId: string
  nodes: Record<string, NodeShape>
}

interface NodeShape {
  // Craft.js's actual node shape has `data`, `events`, `dom`, etc.
  // We treat the object as opaque except for the data.parent /
  // data.nodes / data.linkedNodes refs we need to rewrite.
  data: {
    parent: string | null
    nodes: string[]
    linkedNodes: Record<string, string>
    [k: string]: unknown
  }
  [k: string]: unknown
}

/**
 * Generates a fresh node id. Mirrors Craft's own id format
 * (`<random-alphanumeric>`) close enough to be invisible in the
 * persisted tree. Length 10 base36 ≈ 50 bits — collision-free for
 * any document size.
 */
export function freshNodeId(): string {
  return Math.random().toString(36).slice(2, 12)
}

/**
 * Returns a deep clone of `tree` where every node id is replaced
 * with a fresh one, and every `parent` / `nodes` / `linkedNodes`
 * reference is rewritten to point at the new ids.
 *
 * The new tree's `rootNodeId` is the re-id'd root.
 *
 * @param tree - The source tree (typically from
 *   `query.node(id).toNodeTree()`).
 * @param genId - Override for the id generator. Defaults to
 *   `freshNodeId`; tests pass a deterministic counter.
 */
export function cloneNodeTree(
  tree: NodeTreeShape,
  genId: () => string = freshNodeId,
): NodeTreeShape {
  // Build the old-id → new-id map first, so we can rewrite every
  // reference in a second pass without worrying about order.
  const oldIds = Object.keys(tree.nodes)
  const idMap = new Map<string, string>()
  for (const oldId of oldIds) {
    idMap.set(oldId, genId())
  }

  const newNodes: Record<string, NodeShape> = {}
  for (const oldId of oldIds) {
    const newId = idMap.get(oldId)!
    const oldNode = tree.nodes[oldId]
    const oldData = oldNode.data
    // Deep-ish clone the node (preserve props, custom, etc.) but
    // rewrite the structural fields. Object spread is shallow; that's
    // intentional — Craft's node bodies (props / custom) are user
    // data and we want to share the same reference where possible
    // (the editor will re-immer them on first mutation anyway).
    newNodes[newId] = {
      ...oldNode,
      data: {
        ...oldData,
        // Parent of the root stays whatever it was set to externally
        // (the caller passes parentId to actions.addNodeTree); for
        // non-root nodes it remaps to the new id.
        parent:
          oldData.parent !== null && idMap.has(oldData.parent)
            ? (idMap.get(oldData.parent) as string)
            : oldData.parent,
        nodes: oldData.nodes.map((childId) => idMap.get(childId) ?? childId),
        linkedNodes: remapLinked(oldData.linkedNodes, idMap),
      },
    }
  }

  return {
    rootNodeId: idMap.get(tree.rootNodeId)!,
    nodes: newNodes,
  }
}

function remapLinked(
  linked: Record<string, string>,
  idMap: Map<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [slot, oldId] of Object.entries(linked)) {
    out[slot] = idMap.get(oldId) ?? oldId
  }
  return out
}
