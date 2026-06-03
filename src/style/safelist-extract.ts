// Pure extractor — walks a Craft.js serialized node map and returns the
// Tailwind-style arbitrary class strings that the document's inline + responsive
// inline values would correspond to (`bg-[#ff0000]`, `md:p-[13px]`, etc.).
//
// Phase 8 Group D context — VALVE V1 PARTIAL PULL:
//
// The Phase 6 architecture emits arbitrary CSS via runtime `<style>` injection
// (composeResponsiveInline) — a hash-keyed CSS class generated at render time
// with `@media` rules. That works but is opaque to Tailwind tooling and adds
// per-node `<style>` tags. The Phase 8 plan called for a Vite plugin that
// would emit a build-time Tailwind safelist instead.
//
// The full pipeline (runtime emits Tailwind arbitrary classes; build-time
// safelist generates the matching CSS; HMR rebuilds on document changes) is
// significant additional engineering on top of a Tailwind v4 internals that
// aren't well-documented. The cost/benefit doesn't favor shipping in Phase 8.
//
// What we ship instead: this extractor module. It's a pure utility integration
// consumers can call against their persisted documents to feed their own
// Tailwind safelist build. The editor itself keeps using runtime injection.
// Phase 9 polish can wire this into a Vite plugin if real demand emerges.

const BREAKPOINTS = ['sm', 'md', 'lg', 'xl', '2xl'] as const

// Maps CSS property names (camelCase as stored in NodeStyle.inline /
// .responsiveInline) to Tailwind utility prefixes. Properties not in this map
// don't have a clean Tailwind arbitrary equivalent and are silently skipped —
// integration consumers should ship them via `<style>` injection instead.
const PROP_TO_PREFIX: Record<string, string> = {
  backgroundColor: 'bg',
  color: 'text',
  borderColor: 'border',
  borderRadius: 'rounded',
  borderWidth: 'border',
  width: 'w',
  height: 'h',
  minWidth: 'min-w',
  minHeight: 'min-h',
  maxWidth: 'max-w',
  maxHeight: 'max-h',
  padding: 'p',
  margin: 'm',
  paddingTop: 'pt',
  paddingRight: 'pr',
  paddingBottom: 'pb',
  paddingLeft: 'pl',
  marginTop: 'mt',
  marginRight: 'mr',
  marginBottom: 'mb',
  marginLeft: 'ml',
  opacity: 'opacity',
  gap: 'gap',
}

// Minimal slice of NodeStyle the extractor reads. The full NodeStyle shape
// lives in src/registry/types.ts; we duplicate the structure here so the
// extractor can run outside the editor's runtime (Node-only build scripts).
interface PartialNodeStyle {
  inline?: Record<string, Record<string, string>>
  responsiveInline?: Record<string, Record<string, Record<string, string>>>
  // The real NodeStyle has more fields (classes, responsive). Allow them
  // through so callers can pass full NodeStyle objects without casting.
  [k: string]: unknown
}

interface CraftNode {
  props?: {
    style?: PartialNodeStyle
    [k: string]: unknown
  }
  [k: string]: unknown
}

type CraftTree = Record<string, CraftNode>

function formatClass(prefix: string, value: string, bp?: string): string {
  // Strip whitespace inside arbitrary values — Tailwind requires single-word
  // values without spaces (use `_` for embedded spaces if needed).
  const safe = value.replace(/\s+/g, '_')
  const cls = `${prefix}-[${safe}]`
  return bp ? `${bp}:${cls}` : cls
}

function pushFromInline(
  out: Set<string>,
  inline: Record<string, Record<string, string>> | undefined,
  bp: string | undefined,
): void {
  if (!inline) return
  for (const slot of Object.keys(inline)) {
    const props = inline[slot]
    for (const prop of Object.keys(props)) {
      const prefix = PROP_TO_PREFIX[prop]
      if (!prefix) continue
      out.add(formatClass(prefix, props[prop], bp))
    }
  }
}

/**
 * Walk a Craft tree and collect every arbitrary Tailwind class string the
 * document's inline + responsiveInline values would map to. Returns a
 * deduplicated, sorted array.
 *
 * @example
 *   const tree = JSON.parse(envelope.craftJson)
 *   const classes = extractArbitraryClasses(tree)
 *   // → ['bg-[#ff0000]', 'md:bg-[#00ff00]', 'p-[13px]']
 */
export function extractArbitraryClasses(tree: CraftTree): string[] {
  const out = new Set<string>()
  for (const nodeId of Object.keys(tree)) {
    const node = tree[nodeId]
    const style = node.props?.style
    if (!style) continue
    pushFromInline(out, style.inline, undefined)
    if (style.responsiveInline) {
      for (const bp of BREAKPOINTS) {
        pushFromInline(out, style.responsiveInline[bp], bp)
      }
    }
  }
  return [...out].sort()
}

/**
 * Convenience wrapper for the common case — input is a JSON string of the
 * Craft tree (i.e., the `craftJson` field of an EditorDocument). Returns the
 * same sorted, deduplicated array of arbitrary class strings. Malformed JSON
 * returns an empty array.
 */
export function extractArbitraryClassesFromCraftJson(
  craftJson: string,
): string[] {
  let tree: CraftTree
  try {
    tree = JSON.parse(craftJson) as CraftTree
  } catch {
    return []
  }
  return extractArbitraryClasses(tree)
}

/**
 * Format the extracted classes as Tailwind v4 `@source inline()` directives
 * — one per class, suitable for inclusion in a CSS file consumed by the
 * Tailwind build. Wraps the list in a small documentation block so the
 * generated file is human-readable.
 */
export function formatAsSafelistCss(classes: string[]): string {
  if (classes.length === 0) {
    return '/* No arbitrary classes detected in source documents. */\n'
  }
  const lines: string[] = [
    '/* Auto-generated from document inline + responsiveInline values. */',
    '',
    ...classes.map((c) => `@source inline("${c}");`),
    '',
  ]
  return lines.join('\n')
}
