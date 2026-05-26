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

// Phase 5/6 Tabs had `tabs: [{ value, label, content: string }]`. Phase 7
// moves per-tab content into linked Craft canvases (one per tab), so the
// `content` field on each tab is no longer the source of truth and is
// stripped. We take the same "drop silently" call as the Card migration —
// auto-converting strings to Text canonicals requires synthesizing fresh node
// ids + linked-node wiring that isn't safe to do post-hoc. Designers export
// before upgrading; the tutorial calls out the behavior.
function migrateTabsPropsV7(tree: CraftTree): void {
  for (const nodeId of Object.keys(tree)) {
    const node = tree[nodeId]
    if (node.displayName !== 'Tabs') continue
    const tabs = node.props?.nodeProps?.tabs
    if (!Array.isArray(tabs)) continue
    for (const tab of tabs) {
      if (tab && typeof tab === 'object' && 'content' in tab) {
        delete (tab as Record<string, unknown>).content
      }
    }
  }
}

// Phase 10 § 2.11 — Tabs gain a stable `id` per tab so renaming `value`
// doesn't orphan canvas content. For legacy documents missing the field,
// we synthesise an id that PRESERVES the slot key the prior canvasSlots
// produced (`tab-${uniqueTabValues(tabs)[i]}`) so the existing canvas
// children stay attached to their tabs across the migration boundary.
//
// Idempotent — tabs that already have an id are untouched.
function migrateTabsIdsV10(tree: CraftTree): void {
  for (const nodeId of Object.keys(tree)) {
    const node = tree[nodeId]
    if (node.displayName !== 'Tabs') continue
    const tabs = node.props?.nodeProps?.tabs
    if (!Array.isArray(tabs)) continue
    // Build the same unique-values sequence canvasSlots used pre-Phase-10
    // so injected ids hash to identical slot keys.
    const seen = new Set<string>()
    const slotIds: string[] = []
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i] as { value?: unknown } | null
      const value =
        tab && typeof tab.value === 'string' && tab.value ? tab.value : `_unset_${i}`
      let candidate = value
      let suffix = 1
      while (seen.has(candidate)) {
        candidate = `${value}__${suffix}`
        suffix++
      }
      seen.add(candidate)
      slotIds.push(candidate)
    }
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i]
      if (!tab || typeof tab !== 'object') continue
      if (typeof (tab as { id?: unknown }).id === 'string') continue
      ;(tab as Record<string, unknown>).id = slotIds[i]
    }
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
  migrateTabsPropsV7(tree)
  migrateTabsIdsV10(tree)

  return { ...doc, craftJson: JSON.stringify(tree) }
}
