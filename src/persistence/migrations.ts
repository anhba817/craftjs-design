import type { EditorDocument } from './schema'

// Document migrations run on every load and produce a current-shape document.
// They walk the opaque Craft JSON, mutate stale node shapes in place, and
// re-stringify. Each migration step is idempotent: applying it to an already-
// current document is a no-op.
//
// Adding a migration:
// 1. Bump some version field if the envelope itself changes (it hasn't yet).
// 2. Add a new step function below that walks `craftJson` and converts any
//    stale node shapes to the current shape.
// 3. Call it from `migrateDocument` after the prior steps.

interface CraftNode {
  type?: unknown
  displayName?: string
  isCanvas?: boolean
  props?: { nodeProps?: Record<string, unknown>; [k: string]: unknown }
  // The rest is opaque — Craft owns the full shape.
  [k: string]: unknown
}

type CraftTree = Record<string, CraftNode>

// Phase 5 Card had string props {title, description, showFooter, footerText}.
// Phase 6 multi-canvas Card stores its content as child nodes instead. We
// strip the old props on load. Losing the strings is acceptable for the
// development-time documents this project carries (no production data); a
// future variant could synthesize child Text nodes from the strings, but
// that requires generating fresh node ids and wiring linked-node parents —
// not worth the complexity until a real document warrants it.
function migrateCardPropsV6(tree: CraftTree): void {
  const STALE_KEYS = ['title', 'description', 'showFooter', 'footerText']
  for (const nodeId of Object.keys(tree)) {
    const node = tree[nodeId]
    if (node.displayName !== 'Card') continue
    // Strip stale string props.
    const nodeProps = node.props?.nodeProps
    if (nodeProps) {
      for (const key of STALE_KEYS) {
        if (key in nodeProps) delete nodeProps[key]
      }
    }
    // The outer Card is no longer a canvas — its named slots are. Without
    // flipping the persisted flag, Craft would treat the Card itself as a
    // drop zone too, competing with the inner Element wrappers and breaking
    // hit-testing.
    if (node.isCanvas) node.isCanvas = false
  }
}

export function migrateDocument(doc: EditorDocument): EditorDocument {
  let tree: CraftTree
  try {
    tree = JSON.parse(doc.craftJson) as CraftTree
  } catch {
    // If craftJson isn't parseable JSON, leave it alone — Craft's
    // actions.deserialize will throw, Hydrator will catch and log.
    return doc
  }

  migrateCardPropsV6(tree)

  return { ...doc, craftJson: JSON.stringify(tree) }
}
