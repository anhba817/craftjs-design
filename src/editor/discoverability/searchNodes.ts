// Phase 11 § 3.9 — canvas search match logic.
//
// Pure helper that takes a search term + a flat list of "searchable
// nodes" and returns the ids whose displayName, tags, or common
// string props (label, content, alt) contain the term
// (case-insensitive). Pulled into its own module so it's testable
// without Craft and without a DOM.
//
// Match priority for cycle order: we return ids in the input order
// (the caller passes them in DOM order via a tree walk), which is
// what the user expects when pressing Enter / Shift+Enter to step
// through.

export interface SearchableNode {
  id: string
  displayName: string
  tags?: readonly string[]
  /** Common user-facing string props that we look inside: label,
   *  content, alt. Pull these from the canonical's nodeProps when
   *  building the list. */
  textProps?: Record<string, string | undefined>
}

/**
 * Find every node whose displayName / tags / textProps contain
 * `term` (case-insensitive, substring). Empty `term` returns [].
 *
 * Stable order: matches come back in the same order the caller
 * supplied them. The canvas search overlay walks the tree in DOM
 * order before calling this so Enter cycles top-to-bottom.
 */
export function searchNodes(
  nodes: readonly SearchableNode[],
  term: string,
): SearchableNode[] {
  const normalized = term.trim().toLowerCase()
  if (normalized.length === 0) return []

  const out: SearchableNode[] = []
  for (const node of nodes) {
    if (matches(node, normalized)) out.push(node)
  }
  return out
}

function matches(node: SearchableNode, term: string): boolean {
  if (node.displayName.toLowerCase().includes(term)) return true
  if (node.tags) {
    for (const t of node.tags) {
      if (t.toLowerCase().includes(term)) return true
    }
  }
  if (node.textProps) {
    for (const value of Object.values(node.textProps)) {
      if (typeof value === 'string' && value.toLowerCase().includes(term)) {
        return true
      }
    }
  }
  return false
}
