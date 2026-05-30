import { getComponent } from '@/registry/registry'
import type { NodeStyle } from '@/registry/types'
import { CURRENT_DOCUMENT_VERSION, type EditorDocument } from '../schema'

// Phase 7 template builder. Converts a tree spec (NodeSpec) into a Craft.js
// serialized node map + wraps it in an EditorDocument envelope. The spec is
// authoring-friendly: just nest children, override props/style as needed,
// and the builder fills in the canonical defaults + Craft's bookkeeping
// (parent pointers, nodes arrays, displayName, isCanvas, etc.).
//
// Scope: Pattern A only (single root canvas via the node's `nodes` array).
// Pattern B multi-canvas (Card with header/body/footer slots) requires
// generating linked nodes — punted to Phase 8 polish.

export interface NodeSpec {
  // Canonical id (e.g., 'box', 'text', 'button'). Must be registered before
  // the builder runs — templates load AFTER canonicals via the App.tsx import
  // order.
  canonical: string
  // Override the canonical's default nodeProps. Shallow-merged with defaults.
  nodeProps?: Record<string, unknown>
  // Override the canonical's default style. The `classes` field is merged
  // per-slot; other fields are shallow-merged.
  style?: Partial<NodeStyle>
  // Children for Pattern A canvas canonicals (Box, Stack). Ignored for leaves.
  children?: NodeSpec[]
}

export interface TemplateBuildOptions {
  adapterId?: string
  themeId?: string
  root: NodeSpec
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CraftNode = Record<string, any>

function resolveProps(
  canonical: string,
  override?: Record<string, unknown>,
): Record<string, unknown> {
  const def = getComponent(canonical)
  if (!def) throw new Error(`unknown canonical in template: ${canonical}`)
  return { ...def.defaults.props, ...(override ?? {}) }
}

function resolveStyle(
  canonical: string,
  override?: Partial<NodeStyle>,
): NodeStyle {
  const def = getComponent(canonical)
  if (!def) throw new Error(`unknown canonical in template: ${canonical}`)
  return {
    ...def.defaults.style,
    ...override,
    classes: {
      ...def.defaults.style.classes,
      ...(override?.classes ?? {}),
    },
  }
}

interface BuilderContext {
  nodes: Record<string, CraftNode>
  nextId: number
}

function newId(ctx: BuilderContext): string {
  return `node-${ctx.nextId++}`
}

// Walks a NodeSpec, emitting Craft-shaped nodes into ctx. Returns the node id
// to be referenced as either ROOT or a parent's `nodes` entry.
function buildNode(
  spec: NodeSpec,
  ctx: BuilderContext,
  parent: string | null,
  reservedId?: string,
): string {
  const def = getComponent(spec.canonical)
  if (!def) throw new Error(`unknown canonical in template: ${spec.canonical}`)

  const id = reservedId ?? newId(ctx)
  const node: CraftNode = {
    type: { resolvedName: def.displayName },
    isCanvas: def.isCanvas,
    props: {
      canonicalId: spec.canonical,
      nodeProps: resolveProps(spec.canonical, spec.nodeProps),
      style: resolveStyle(spec.canonical, spec.style),
    },
    displayName: def.displayName,
    custom: {},
    parent,
    hidden: false,
    nodes: [],
    linkedNodes: {},
  }

  if (spec.children && def.isCanvas) {
    for (const childSpec of spec.children) {
      const childId = buildNode(childSpec, ctx, id)
      node.nodes.push(childId)
    }
  }

  ctx.nodes[id] = node
  return id
}

/**
 * Build a complete EditorDocument from a NodeSpec tree.
 *
 * The root of the tree is emitted as the literal id 'ROOT' (Craft's
 * convention) so the rest of the editor's selection / hit-testing code
 * recognizes it as the document root.
 */
export function buildTemplate(options: TemplateBuildOptions): EditorDocument {
  const ctx: BuilderContext = { nodes: {}, nextId: 0 }
  buildNode(options.root, ctx, null, 'ROOT')
  return {
    version: CURRENT_DOCUMENT_VERSION,
    adapterId: options.adapterId ?? 'shadcn',
    themeId: options.themeId,
    craftJson: JSON.stringify(ctx.nodes),
  }
}
