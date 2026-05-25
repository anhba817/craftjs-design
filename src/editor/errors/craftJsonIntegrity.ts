import { getComponentByDisplayName } from '@/registry/registry'

// Phase 9 § 1.9 — pre-deserialize integrity check for Craft.js documents.
//
// Why a pre-check (instead of relying on actions.deserialize to throw):
// Craft.js's deserialize is permissive — it'll happily reconstruct a tree
// with dangling `parent` refs, missing nodes, or non-resolvable types,
// only to crash later during the first render. Catching the structural
// issue BEFORE deserialize means:
//   - The error message points at the failed invariant (e.g. "node 'A'
//     references missing parent 'B'") instead of a stack from inside
//     Craft's render.
//   - We can choose not to deserialize at all when the tree is broken,
//     leaving the editor in a clean state so MalformedDocumentBanner
//     can offer recovery actions.
//
// What we validate:
//   1. The craftJson string parses as JSON and yields an object.
//   2. ROOT exists.
//   3. Every node has a `type` field — string OR `{ resolvedName: string }`.
//   4. `resolvedName` is either 'div' OR a registered canonical's
//      displayName. Other strings (e.g. typo'd canonicals) fail.
//   5. Every `parent` ref is either null OR references another node in
//      the tree.
//   6. Every entry in `nodes[]` references another node.
//   7. Every value in `linkedNodes` (record) references another node.
//
// We don't try to reproduce Craft's deserialize logic — many shape
// details are Craft's concern. The invariants above are the minimum
// for the tree to be coherent.

export type IntegrityCheckResult =
  | { ok: true }
  | { ok: false; error: Error }

interface CraftNode {
  type?: unknown
  parent?: unknown
  nodes?: unknown
  linkedNodes?: unknown
}

const INTEGRITY_LABEL = '[craftJson integrity]'

function fail(message: string): IntegrityCheckResult {
  return { ok: false, error: new Error(`${INTEGRITY_LABEL} ${message}`) }
}

export function validateCraftJson(json: string): IntegrityCheckResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    return fail(
      `failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fail('expected an object at the root')
  }
  const tree = parsed as Record<string, CraftNode>
  const ids = Object.keys(tree)
  if (!ids.includes('ROOT')) {
    return fail('missing required ROOT node')
  }
  const idSet = new Set(ids)

  for (const id of ids) {
    const node = tree[id]
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return fail(`node '${id}' is not an object`)
    }
    // Type check.
    const typeCheck = checkType(node.type)
    if (!typeCheck.ok) return fail(`node '${id}': ${typeCheck.reason}`)
    // Parent ref.
    if (node.parent !== null && node.parent !== undefined) {
      if (typeof node.parent !== 'string') {
        return fail(`node '${id}': parent must be a string or null`)
      }
      if (!idSet.has(node.parent)) {
        return fail(
          `node '${id}': parent '${node.parent}' is not in the tree`,
        )
      }
    }
    // Child ids.
    if (node.nodes !== undefined) {
      if (!Array.isArray(node.nodes)) {
        return fail(`node '${id}': nodes must be an array`)
      }
      for (const childId of node.nodes) {
        if (typeof childId !== 'string') {
          return fail(`node '${id}': nodes contains a non-string entry`)
        }
        if (!idSet.has(childId)) {
          return fail(
            `node '${id}': nodes references missing child '${childId}'`,
          )
        }
      }
    }
    // Linked-canvas slots (Pattern B).
    if (node.linkedNodes !== undefined) {
      if (
        !node.linkedNodes ||
        typeof node.linkedNodes !== 'object' ||
        Array.isArray(node.linkedNodes)
      ) {
        return fail(`node '${id}': linkedNodes must be an object`)
      }
      for (const [slot, linked] of Object.entries(
        node.linkedNodes as Record<string, unknown>,
      )) {
        if (typeof linked !== 'string') {
          return fail(
            `node '${id}': linkedNodes['${slot}'] must be a string`,
          )
        }
        if (!idSet.has(linked)) {
          return fail(
            `node '${id}': linkedNodes['${slot}'] references missing node '${linked}'`,
          )
        }
      }
    }
  }
  return { ok: true }
}

function checkType(
  type: unknown,
): { ok: true } | { ok: false; reason: string } {
  if (typeof type === 'string') {
    if (type === 'div') return { ok: true }
    if (getComponentByDisplayName(type)) return { ok: true }
    return { ok: false, reason: `type '${type}' is not a registered canonical` }
  }
  if (
    type &&
    typeof type === 'object' &&
    typeof (type as { resolvedName?: unknown }).resolvedName === 'string'
  ) {
    const name = (type as { resolvedName: string }).resolvedName
    if (name === 'div') return { ok: true }
    if (getComponentByDisplayName(name)) return { ok: true }
    return {
      ok: false,
      reason: `type.resolvedName '${name}' is not a registered canonical`,
    }
  }
  return {
    ok: false,
    reason: 'type must be a string or { resolvedName: string }',
  }
}
