// Phase 21 — pure, immutable edit operations on an EditorDocument. Each op
// parses the envelope's craftJson, applies a validated change to a copy, and
// returns a NEW envelope — the input document is never mutated, and a failed
// op throws without producing a half-edited document. Node addressing uses the
// builder's stable ids (`heading-1`, …); `addNode` returns the new id.
import { getComponent, getComponentByDisplayName } from '@/registry/registry'
import type { NodeStyle } from '@/registry/types'
import type { EditorDocument } from '@/persistence/schema'
import {
  buildSubtree,
  resolveProps,
  seedCounters,
  slotKeysFor,
  type HeadlessNodeSpec,
  type SerializedCraftNode,
  type SerializedNodeMap,
} from './build'

function parseNodes(doc: EditorDocument): SerializedNodeMap {
  let parsed: unknown
  try {
    parsed = JSON.parse(doc.craftJson)
  } catch {
    throw new Error('document craftJson is not valid JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('document craftJson is not a node map')
  }
  return parsed as SerializedNodeMap
}

function commit(doc: EditorDocument, nodes: SerializedNodeMap): EditorDocument {
  return { ...doc, craftJson: JSON.stringify(nodes) }
}

function getNode(nodes: SerializedNodeMap, id: string): SerializedCraftNode {
  const node = nodes[id]
  if (!node) throw new Error(`unknown node "${id}"`)
  return node
}

/** The canonical id behind a node (slot `div` containers return null). */
export function canonicalIdOf(node: SerializedCraftNode): string | null {
  const fromProp = node.props?.canonicalId
  if (typeof fromProp === 'string') return fromProp
  const name =
    typeof node.type === 'string' ? node.type : node.type?.resolvedName
  if (!name || name === 'div') return null
  return getComponentByDisplayName(name)?.id ?? null
}

/** True when `id` is a slot container (a value in some node's linkedNodes). */
function isSlotContainer(nodes: SerializedNodeMap, id: string): boolean {
  const parentId = nodes[id]?.parent
  if (!parentId) return false
  const parent = nodes[parentId]
  return !!parent && Object.values(parent.linkedNodes ?? {}).includes(id)
}

// Resolve where a child should be attached: either the parent itself
// (Pattern A canvas) or one of its slot containers (Pattern B).
function resolveContainer(
  nodes: SerializedNodeMap,
  parentId: string,
  slot?: string,
): { containerId: string; container: SerializedCraftNode } {
  const parent = getNode(nodes, parentId)
  if (slot !== undefined) {
    const slotNodeId = parent.linkedNodes?.[slot]
    if (!slotNodeId) {
      const slots = Object.keys(parent.linkedNodes ?? {})
      throw new Error(
        `node "${parentId}" has no slot "${slot}"${slots.length ? ` (slots: ${slots.join(', ')})` : ''}`,
      )
    }
    return { containerId: slotNodeId, container: getNode(nodes, slotNodeId) }
  }
  const slots = Object.keys(parent.linkedNodes ?? {})
  if (!parent.isCanvas) {
    throw new Error(
      slots.length
        ? `node "${parentId}" is multi-canvas — pass a slot (${slots.join(', ')})`
        : `node "${parentId}" is not a canvas — children can't be added to it`,
    )
  }
  return { containerId: parentId, container: parent }
}

export interface AddNodeOptions {
  /** Insert position among the container's children. Default: append. */
  index?: number
  /** Pattern B target slot on the parent (Card: 'header' | 'body' | …). */
  slot?: string
}

/** Add a spec subtree under a parent (or one of its slots). */
export function addNode(
  doc: EditorDocument,
  spec: HeadlessNodeSpec,
  parentId: string,
  options: AddNodeOptions = {},
): { document: EditorDocument; nodeId: string } {
  const nodes = parseNodes(doc)
  const { containerId, container } = resolveContainer(
    nodes,
    parentId,
    options.slot,
  )
  const ctx = { nodes, counters: {} }
  seedCounters(ctx)
  const nodeId = buildSubtree(spec, ctx, containerId)
  const at = options.index ?? container.nodes.length
  container.nodes.splice(Math.max(0, Math.min(at, container.nodes.length)), 0, nodeId)
  return { document: commit(doc, nodes), nodeId }
}

/**
 * Merge a props patch into a node (schema-checked against its canonical).
 * For multi-canvas canonicals with DYNAMIC slot lists (Tabs/Table/…), newly
 * required slots are created; slots no longer in the list keep their nodes
 * (same as the live editor — content isn't destroyed by a props change).
 */
export function updateNodeProps(
  doc: EditorDocument,
  nodeId: string,
  patch: Record<string, unknown>,
): EditorDocument {
  const nodes = parseNodes(doc)
  const node = getNode(nodes, nodeId)
  const canonical = canonicalIdOf(node)
  if (!canonical) {
    throw new Error(`node "${nodeId}" is a slot container — edit its parent`)
  }
  const current = (node.props.nodeProps ?? {}) as Record<string, unknown>
  const next = resolveProps(canonical, { ...current, ...patch })
  node.props = { ...node.props, nodeProps: next }

  // Reconcile dynamic slots: create containers for slots the new props
  // introduce (e.g. a new tab). Existing containers for dropped slots stay.
  const def = getComponent(canonical)
  if (def?.canvasSlots) {
    const ctx = { nodes, counters: {} }
    seedCounters(ctx)
    for (const key of slotKeysFor(canonical, next)) {
      if (!node.linkedNodes[key]) {
        node.linkedNodes[key] = buildEmptySlot(def.slotComponent, key, ctx, nodeId)
      }
    }
  }
  return commit(doc, nodes)
}

// Internal: an empty slot container (mirrors build.ts's buildSlotContainer).
function buildEmptySlot(
  slotComponent: string | undefined,
  slotKey: string,
  ctx: { nodes: SerializedNodeMap; counters: Record<string, number> },
  parentId: string,
): string {
  // Reuse the builder by constructing through buildSubtree for slotComponent
  // nodes; plain div containers are emitted inline.
  if (slotComponent) {
    const id = buildSubtree({ canonical: slotComponent }, ctx, parentId)
    return id
  }
  const n = (ctx.counters[`slot-${slotKey}`] ?? 0) + 1
  ctx.counters[`slot-${slotKey}`] = n
  const id = `slot-${slotKey}-${n}`
  ctx.nodes[id] = {
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
  return id
}

/** Merge a style patch into a node (classes merge per style-slot). */
export function updateNodeStyle(
  doc: EditorDocument,
  nodeId: string,
  patch: Partial<NodeStyle>,
): EditorDocument {
  const nodes = parseNodes(doc)
  const node = getNode(nodes, nodeId)
  if (!canonicalIdOf(node)) {
    throw new Error(`node "${nodeId}" is a slot container — style its parent`)
  }
  const current = (node.props.style ?? { classes: {} }) as NodeStyle
  node.props = {
    ...node.props,
    style: {
      ...current,
      ...patch,
      classes: { ...current.classes, ...(patch.classes ?? {}) },
    },
  }
  return commit(doc, nodes)
}

function collectSubtree(
  nodes: SerializedNodeMap,
  id: string,
  out: Set<string>,
): void {
  out.add(id)
  const node = nodes[id]
  if (!node) return
  for (const child of node.nodes ?? []) collectSubtree(nodes, child, out)
  for (const linked of Object.values(node.linkedNodes ?? {})) {
    collectSubtree(nodes, linked, out)
  }
}

/** Remove a node (and its whole subtree). ROOT and slot containers refuse. */
export function removeNode(doc: EditorDocument, nodeId: string): EditorDocument {
  if (nodeId === 'ROOT') throw new Error('cannot remove the document root')
  const nodes = parseNodes(doc)
  getNode(nodes, nodeId)
  if (isSlotContainer(nodes, nodeId)) {
    throw new Error(
      `node "${nodeId}" is a slot container (structural) — remove its children instead`,
    )
  }
  const parentId = nodes[nodeId].parent
  if (parentId && nodes[parentId]) {
    nodes[parentId].nodes = nodes[parentId].nodes.filter((n) => n !== nodeId)
  }
  const doomed = new Set<string>()
  collectSubtree(nodes, nodeId, doomed)
  for (const id of doomed) delete nodes[id]
  return commit(doc, nodes)
}

export interface MoveNodeOptions {
  index?: number
  slot?: string
}

/** Move a node under a new parent (or one of its slots). Cycle-safe. */
export function moveNode(
  doc: EditorDocument,
  nodeId: string,
  newParentId: string,
  options: MoveNodeOptions = {},
): EditorDocument {
  if (nodeId === 'ROOT') throw new Error('cannot move the document root')
  const nodes = parseNodes(doc)
  const node = getNode(nodes, nodeId)
  if (isSlotContainer(nodes, nodeId)) {
    throw new Error(`node "${nodeId}" is a slot container — move its children instead`)
  }
  const { containerId, container } = resolveContainer(
    nodes,
    newParentId,
    options.slot,
  )
  // Cycle check: the target container must not live inside the moving subtree.
  const subtree = new Set<string>()
  collectSubtree(nodes, nodeId, subtree)
  if (subtree.has(containerId)) {
    throw new Error(`cannot move "${nodeId}" into its own subtree`)
  }
  const oldParentId = node.parent
  if (oldParentId && nodes[oldParentId]) {
    nodes[oldParentId].nodes = nodes[oldParentId].nodes.filter(
      (n) => n !== nodeId,
    )
  }
  const at = options.index ?? container.nodes.length
  container.nodes.splice(Math.max(0, Math.min(at, container.nodes.length)), 0, nodeId)
  node.parent = containerId
  return commit(doc, nodes)
}
