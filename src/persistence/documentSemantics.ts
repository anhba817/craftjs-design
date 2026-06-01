import { z } from 'zod'
import { getComponentByDisplayName } from '@/registry/registry'
import { nodeStyleSchema } from '@/registry/nodeStyleSchema'

// Phase 18 § 4 — semantic document validation.
//
// `validateCraftJson` (craftJsonIntegrity.ts) checks the node GRAPH is
// coherent (ROOT exists, refs resolve, types are registered). It treats each
// node's `props` as opaque. This pass is the second, SEMANTIC layer: for each
// node it validates the persisted `nodeProps` against the canonical's
// `propsSchema` and the `style` against `nodeStyleSchema`, catching corrupt
// data (a number where a string belongs, a malformed style block) that would
// otherwise surface as a confusing mid-render glitch or crash.
//
// Policy: LENIENT + reported (see PHASE18_PLAN Resolved Decision 2). This
// returns a list of issues; it never throws and never blocks the load. The
// caller (applyEnvelopeSafely) routes the issues to the telemetry seam + a dev
// warning, then deserializes as normal. A document that loads today keeps
// loading — one corrupt prop must not blank the canvas.
//
// Two deliberate leniencies keep the signal high:
//   - props are validated with the canonical's schema made `.partial()`, so a
//     present-but-wrong-TYPE field is flagged while a legitimately-absent
//     field (the node relies on defaults) is not;
//   - `nodeProps` / `style` are only checked when present — a minimal node
//     (`props: {}`) is valid.

export interface SemanticIssue {
  nodeId: string
  /** The canonical's display name (resolvedName), for the report. */
  displayName: string
  kind: 'props' | 'style'
  message: string
}

interface CraftNodeLike {
  type?: unknown
  props?: unknown
}

function resolvedNameOf(type: unknown): string | null {
  if (typeof type === 'string') return type
  if (type && typeof type === 'object' && 'resolvedName' in type) {
    const rn = (type as { resolvedName: unknown }).resolvedName
    return typeof rn === 'string' ? rn : null
  }
  return null
}

function firstIssue(error: z.ZodError): string {
  const i = error.issues[0]
  if (!i) return 'invalid'
  const path = i.path.join('.')
  return path ? `${path}: ${i.message}` : i.message
}

/**
 * Validate the props + style of every node in a (structurally-valid) craftJson
 * string. Returns the issues found; `[]` when the document is clean. Pure and
 * non-throwing — JSON parse / shape errors are the structural check's domain
 * and yield `[]` here.
 */
export function validateDocumentSemantics(json: string): SemanticIssue[] {
  let tree: Record<string, CraftNodeLike>
  try {
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    tree = parsed
  } catch {
    return []
  }

  const issues: SemanticIssue[] = []
  for (const [nodeId, node] of Object.entries(tree)) {
    if (!node || typeof node !== 'object') continue
    const name = resolvedNameOf(node.type)
    // Plain <div> canvas slots and unknown types carry no canonical schema —
    // unknown types are the structural check's concern.
    if (!name || name === 'div') continue
    const def = getComponentByDisplayName(name)
    if (!def) continue

    const props = node.props
    if (!props || typeof props !== 'object') continue
    const { nodeProps, style } = props as {
      nodeProps?: unknown
      style?: unknown
    }

    if (style !== undefined) {
      const r = nodeStyleSchema.safeParse(style)
      if (!r.success) {
        issues.push({
          nodeId,
          displayName: name,
          kind: 'style',
          message: firstIssue(r.error),
        })
      }
    }

    // `.partial()` so we flag wrong-typed present fields but tolerate
    // legitimately-absent ones (the node uses the canonical's default).
    if (nodeProps !== undefined && def.propsSchema instanceof z.ZodObject) {
      const r = def.propsSchema.partial().safeParse(nodeProps)
      if (!r.success) {
        issues.push({
          nodeId,
          displayName: name,
          kind: 'props',
          message: firstIssue(r.error),
        })
      }
    }
  }
  return issues
}
