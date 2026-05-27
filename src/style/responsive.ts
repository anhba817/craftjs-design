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

  // (bp, base state) → `<bp>:cls`
  if (style.responsive) {
    for (const bp of BREAKPOINT_ORDER) {
      pushPrefixed(parts, style.responsive[bp]?.[slot], `${bp}:`)
    }
  }

  // Phase 12 § 4.2 — pseudo-class state quadrants.
  // (base bp, state) → `<state>:cls`
  if (style.states) {
    for (const st of STATE_ORDER) {
      pushPrefixed(parts, style.states[st]?.[slot], `${st}:`)
    }
  }
  // (bp, state) → `<bp>:<state>:cls` (breakpoint outermost).
  if (style.stateResponsive) {
    for (const bp of BREAKPOINT_ORDER) {
      for (const st of STATE_ORDER) {
        pushPrefixed(
          parts,
          style.stateResponsive[bp]?.[st]?.[slot],
          `${bp}:${st}:`,
        )
      }
    }
  }

  return parts.join(' ')
}

const STATE_ORDER = ['hover', 'focus', 'active'] as const

function pushPrefixed(
  parts: string[],
  classString: string | undefined,
  prefix: string,
): void {
  if (!classString) return
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    parts.push(`${prefix}${cls}`)
  }
}
