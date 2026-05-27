// Phase 12 § 4.3–4.5 — parse / compose for the CSS `transform` and
// `filter` properties, which are each a SINGLE property holding an
// ordered list of functions (`transform: rotate(45deg) scale(1.1)`,
// `filter: blur(4px) brightness(1.1)`).
//
// Why inline (not Tailwind classes): the panels let the user type a
// custom value, and arbitrary Tailwind classes (`rotate-[17deg]`)
// can't be safelisted (infinite). Inline CSS works for any value AND
// composes correctly — one property string holds every function. The
// same reason means ONE panel owns each property (the Filters panel
// owns all of `filter`, including blur).
//
// Storage: `style.inline[slot].transform` / `.filter` (and the
// responsive/state inline buckets for variants). Sub-values are kept
// as raw CSS argument strings (`'45deg'`, `'1.1'`, `'4px'`) so any
// value round-trips; presets in the UI are just common raw values.

/** Ordered transform functions we surface. Order = emit order. */
export const TRANSFORM_FNS = [
  'rotate',
  'scale',
  'translateX',
  'translateY',
  'skewX',
  'skewY',
] as const
export type TransformFn = (typeof TRANSFORM_FNS)[number]

/** Ordered filter functions we surface. */
export const FILTER_FNS = [
  'blur',
  'brightness',
  'contrast',
  'saturate',
  'grayscale',
  'invert',
  'sepia',
  'drop-shadow',
] as const
export type FilterFn = (typeof FILTER_FNS)[number]

const NAME_CHAR = /[a-zA-Z-]/
const WS = /\s/

/**
 * Parse a `transform` / `filter` value string into a
 * `{ fnName: arg }` map. Unknown functions are kept too (so a value
 * we don't have a field for round-trips untouched).
 *
 * Balanced-paren scan rather than a regex: filter args can contain
 * nested parens — `drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))` — which a
 * `[^)]*` regex would truncate at the inner `rgb(`'s close.
 */
export function parseFunctionList(value: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!value) return out
  const n = value.length
  let i = 0
  while (i < n) {
    while (i < n && WS.test(value[i])) i++
    const nameStart = i
    while (i < n && NAME_CHAR.test(value[i])) i++
    const name = value.slice(nameStart, i)
    if (!name || value[i] !== '(') {
      // Not a `name(` — skip this token and continue.
      while (i < n && !WS.test(value[i])) i++
      continue
    }
    i++ // consume '('
    const argStart = i
    let depth = 1
    while (i < n && depth > 0) {
      const ch = value[i]
      if (ch === '(') depth++
      else if (ch === ')') {
        depth--
        if (depth === 0) break
      }
      i++
    }
    out[name] = value.slice(argStart, i).trim()
    i++ // consume the matching ')'
  }
  return out
}

/**
 * Compose a `{ fnName: arg }` map back into a CSS value string, in the
 * given order. Keys not in `order` (unknown-but-preserved functions)
 * are appended after, in insertion order. Empty/undefined args are
 * dropped.
 */
export function composeFunctionList(
  map: Record<string, string | undefined>,
  order: readonly string[],
): string {
  const parts: string[] = []
  const ordered = new Set(order)
  for (const fn of order) {
    const arg = map[fn]
    if (arg !== undefined && arg !== '') parts.push(`${fn}(${arg})`)
  }
  for (const [fn, arg] of Object.entries(map)) {
    if (ordered.has(fn)) continue
    if (arg !== undefined && arg !== '') parts.push(`${fn}(${arg})`)
  }
  return parts.join(' ')
}

/**
 * Update one function's arg in a CSS value string and return the new
 * string. `arg === undefined | ''` removes the function.
 */
export function setFunctionArg(
  value: string,
  order: readonly string[],
  fn: string,
  arg: string | undefined,
): string {
  const map = parseFunctionList(value)
  if (arg === undefined || arg === '') delete map[fn]
  else map[fn] = arg
  return composeFunctionList(map, order)
}
