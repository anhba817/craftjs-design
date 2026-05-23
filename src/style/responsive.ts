import type { NodeStyle } from '@/registry/types'

// Tailwind v4 default breakpoints. Matches the keys in NodeStyle.responsive
// and the Breakpoint union in editorStore. The order matters: it determines
// the order of prefixed utilities in the output (sm before md before lg, …),
// which the browser/Tailwind happily processes via CSS cascade.
const BREAKPOINT_ORDER = ['sm', 'md', 'lg', 'xl', '2xl'] as const

/**
 * Composes a node's style data into a single className for a slot.
 *
 * Reads `style.classes[slot]` (the base/no-prefix tier), then walks
 * `style.responsive[bp][slot]` for each breakpoint in order and prefixes
 * each class with `<bp>:`. Tailwind's responsive variants then apply at the
 * matching media query at render time.
 *
 * Example:
 *   classes.root      = 'text-base p-4'
 *   responsive.md.root = 'text-lg p-6'
 *   responsive.lg.root = 'text-xl'
 *
 * Output: 'text-base p-4 md:text-lg md:p-6 lg:text-xl'
 *
 * Inspector panels write via useNodeClasses (Phase 4 Step 12) which keys off
 * the active breakpoint; this composer reads them all and assembles the
 * final className that hits the DOM.
 */
export function composeResponsive(style: NodeStyle, slot: string = 'root'): string {
  const parts: string[] = []
  const base = style.classes?.[slot]
  if (base) parts.push(base)

  if (style.responsive) {
    for (const bp of BREAKPOINT_ORDER) {
      const sliced = style.responsive[bp]?.[slot]
      if (!sliced) continue
      for (const cls of sliced.split(/\s+/).filter(Boolean)) {
        parts.push(`${bp}:${cls}`)
      }
    }
  }

  return parts.join(' ')
}
