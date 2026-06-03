// Phase 21 — headless document construction (no React, no DOM, no Craft
// runtime). Generalizes the Phase 7 template builder into the public
// `@crafted-design/editor/headless` API: an authoring-friendly spec tree is
// compiled into the same Craft.js serialized node map the editor produces,
// wrapped in the EditorDocument envelope. Adds what the template builder
// lacked:
//   - Pattern B multi-canvas: `slots` on a spec emits the parent's
//     `linkedNodes` + one slot-container node per canvas slot, mirroring the
//     <Element id={slot}> wrappers CanonicalNode renders (plain `div` with the
//     `canvas-slot` class, or the canonical's `slotComponent` — Table cells).
//   - Dynamic slot lists: `canvasSlots` functions (Tabs/Carousel/Stepper/
//     Table) are resolved against the node's RESOLVED props, exactly like the
//     runtime.
//   - Props validation: node props are checked against the canonical's zod
//     schema at build time, so an invalid document can't be constructed.
//   - Deterministic, human-readable node ids (`heading-1`, `card-2`, …) so
//     callers (and AI agents driving the MCP server) can address nodes.
import { getComponent } from '@/registry/registry'
import type { NodeStyle } from '@/registry/types'
import {
  CURRENT_DOCUMENT_VERSION,
  type EditorDocument,
} from '@/persistence/schema'

/** Authoring-friendly node spec — nest children, override props/style. */
export interface HeadlessNodeSpec {
  /** Canonical id (e.g. `'box'`, `'heading'`, `'card'`). Must be registered. */
  canonical: string
  /** Overrides merged onto the canonical's default props (schema-checked). */
  nodeProps?: Record<string, unknown>
  /** Overrides merged onto the canonical's default style (classes per-slot). */
  style?: Partial<NodeStyle>
  /**
   * Children for Pattern A canvas canonicals (Box, Stack, Section, …).
   * Rejected on leaves and on Pattern B canonicals (use `slots`).
   */
  children?: HeadlessNodeSpec[]
  /**
   * Pattern B multi-canvas content, keyed by slot (Card: header/body/footer;
   * Tabs: `tab-<value>`; Table: cell keys). Unknown slot keys are rejected;
   * omitted slots are created empty (matching the editor, which renders every
   * slot container even when empty).
   */
  slots?: Record<string, HeadlessNodeSpec[]>
}

export interface BuildDocumentOptions {
  root: HeadlessNodeSpec
  adapterId?: string
  themeId?: string
  colorMode?: 'light' | 'dark' | 'system'
}

// The serialized Craft node shape (mirrors what the editor's own
// serialization produces — see cloneNodeTree.ts / the template builder).
export interface SerializedCraftNode {
  type: string | { resolvedName: string }
  isCanvas: boolean
  props: Record<string, unknown>
  displayName: string
  custom: Record<string, unknown>
  parent: string | null
  hidden: boolean
  nodes: string[]
  linkedNodes: Record<string, string>
}

export type SerializedNodeMap = Record<string, SerializedCraftNode>

export interface BuildContext {
  nodes: SerializedNodeMap
  counters: Record<string, number>
}

export function newBuildContext(): BuildContext {
  return { nodes: {}, counters: {} }
}

/**
 * Seed id counters from an existing node map so ids generated for nodes added
 * to an existing document never collide (`heading-3` after `heading-2`).
 */
export function seedCounters(ctx: BuildContext): void {
  for (const id of Object.keys(ctx.nodes)) {
    const m = /^(.*)-(\d+)$/.exec(id)
    if (!m) continue
    const n = Number(m[2])
    if (n > (ctx.counters[m[1]] ?? 0)) ctx.counters[m[1]] = n
  }
}

function nextId(ctx: BuildContext, prefix: string): string {
  ctx.counters[prefix] = (ctx.counters[prefix] ?? 0) + 1
  return `${prefix}-${ctx.counters[prefix]}`
}

/** Merge + schema-check a canonical's props. Throws with readable issues. */
export function resolveProps(
  canonical: string,
  override?: Record<string, unknown>,
): Record<string, unknown> {
  const def = getComponent(canonical)
  if (!def) throw new Error(`unknown canonical "${canonical}"`)
  const merged = { ...def.defaults.props, ...(override ?? {}) }
  const parsed = def.propsSchema.safeParse(merged)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    throw new Error(`invalid props for "${canonical}": ${issues}`)
  }
  return parsed.data as Record<string, unknown>
}

/** Merge a style override onto the canonical's defaults (classes per-slot). */
export function resolveStyle(
  canonical: string,
  override?: Partial<NodeStyle>,
): NodeStyle {
  const def = getComponent(canonical)
  if (!def) throw new Error(`unknown canonical "${canonical}"`)
  return {
    ...def.defaults.style,
    ...override,
    classes: {
      ...def.defaults.style.classes,
      ...(override?.classes ?? {}),
    },
  }
}

/** The canvas-slot keys a canonical exposes for the given resolved props. */
export function slotKeysFor(
  canonical: string,
  resolvedProps: Record<string, unknown>,
): readonly string[] {
  const def = getComponent(canonical)
  if (!def?.canvasSlots) return []
  return typeof def.canvasSlots === 'function'
    ? def.canvasSlots(resolvedProps)
    : def.canvasSlots
}

/**
 * Emit one spec subtree into `ctx`, returning the new node's id. Exported for
 * the edit operations (`addNode`) — not part of the public index surface.
 */
export function buildSubtree(
  spec: HeadlessNodeSpec,
  ctx: BuildContext,
  parent: string | null,
  reservedId?: string,
): string {
  const def = getComponent(spec.canonical)
  if (!def) throw new Error(`unknown canonical "${spec.canonical}"`)

  const props = resolveProps(spec.canonical, spec.nodeProps)
  const style = resolveStyle(spec.canonical, spec.style)
  const slotKeys = slotKeysFor(spec.canonical, props)

  if (spec.children?.length && slotKeys.length > 0) {
    throw new Error(
      `"${spec.canonical}" is a multi-canvas canonical — put content in \`slots\` (${slotKeys.join(', ')}), not \`children\``,
    )
  }
  if (spec.children?.length && !def.isCanvas) {
    throw new Error(`"${spec.canonical}" is a leaf — it can't have children`)
  }
  if (spec.slots && slotKeys.length === 0) {
    throw new Error(`"${spec.canonical}" has no canvas slots — use \`children\``)
  }
  for (const key of Object.keys(spec.slots ?? {})) {
    if (!slotKeys.includes(key)) {
      throw new Error(
        `"${spec.canonical}" has no slot "${key}" (slots for these props: ${slotKeys.join(', ')})`,
      )
    }
  }

  const id = reservedId ?? nextId(ctx, spec.canonical)
  const node: SerializedCraftNode = {
    type: { resolvedName: def.displayName },
    isCanvas: def.isCanvas,
    props: { canonicalId: spec.canonical, nodeProps: props, style },
    displayName: def.displayName,
    custom: {},
    parent,
    hidden: false,
    nodes: [],
    linkedNodes: {},
  }
  ctx.nodes[id] = node

  // Pattern A children.
  if (spec.children && def.isCanvas) {
    for (const childSpec of spec.children) {
      node.nodes.push(buildSubtree(childSpec, ctx, id))
    }
  }

  // Pattern B: one slot-container node per canvas slot — ALWAYS created (the
  // editor renders an <Element> per slot even when empty), linked from the
  // parent via `linkedNodes[slotKey]`.
  for (const key of slotKeys) {
    node.linkedNodes[key] = buildSlotContainer(
      def.slotComponent,
      key,
      spec.slots?.[key] ?? [],
      ctx,
      id,
    )
  }

  return id
}

// Mirrors CanonicalNode's slot wrappers: `<Element id={slot} is="div" canvas
// className="canvas-slot">` for plain slots, or `<Element is={SlotComponent}
// canvas={slotDef.isCanvas} nodeProps={defaults} style={defaults}>` when the
// canonical sets `slotComponent` (Table → table-cell).
function buildSlotContainer(
  slotComponent: string | undefined,
  slotKey: string,
  children: HeadlessNodeSpec[],
  ctx: BuildContext,
  parentId: string,
): string {
  let node: SerializedCraftNode
  let idPrefix: string
  if (slotComponent) {
    const slotDef = getComponent(slotComponent)
    if (!slotDef) {
      throw new Error(`slot component "${slotComponent}" is not registered`)
    }
    idPrefix = slotComponent
    node = {
      type: { resolvedName: slotDef.displayName },
      isCanvas: slotDef.isCanvas,
      props: {
        canonicalId: slotComponent,
        nodeProps: { ...slotDef.defaults.props },
        style: resolveStyle(slotComponent),
      },
      displayName: slotDef.displayName,
      custom: {},
      parent: parentId,
      hidden: false,
      nodes: [],
      linkedNodes: {},
    }
  } else {
    idPrefix = 'slot'
    node = {
      type: 'div',
      isCanvas: true,
      props: { className: 'canvas-slot' },
      displayName: 'div',
      custom: {},
      parent: parentId,
      hidden: false,
      nodes: [],
      linkedNodes: {},
    }
  }
  const id = nextId(ctx, `${idPrefix}-${slotKey}`)
  ctx.nodes[id] = node
  for (const childSpec of children) {
    node.nodes.push(buildSubtree(childSpec, ctx, id))
  }
  return id
}

/**
 * Build a complete, validated EditorDocument from a spec tree. The root node
 * gets Craft's literal `'ROOT'` id; all other ids are deterministic and
 * human-readable (`heading-1`, `card-2`, `slot-header-1`, …).
 */
export function buildDocument(options: BuildDocumentOptions): EditorDocument {
  const ctx = newBuildContext()
  buildSubtree(options.root, ctx, null, 'ROOT')
  return {
    version: CURRENT_DOCUMENT_VERSION,
    adapterId: options.adapterId ?? 'shadcn',
    themeId: options.themeId,
    colorMode: options.colorMode,
    craftJson: JSON.stringify(ctx.nodes),
  }
}
