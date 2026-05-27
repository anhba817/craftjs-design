import type { NodeStyle } from '@/registry/types'

// Tailwind v4 default breakpoints — kept here as a small adapter so we don't
// depend on Tailwind's runtime config. If the project ever customizes
// breakpoints, this table needs to track that.
const BP_MIN_WIDTH: Record<string, string> = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
}

const BP_ORDER = ['sm', 'md', 'lg', 'xl', '2xl'] as const

// camelCase → kebab-case. React's CSSProperties keys are camelCase
// (backgroundColor); CSS declarations expect kebab-case (background-color).
function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

function declarations(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${camelToKebab(k)}: ${v};`)
    .join(' ')
}

// Stable djb2 hash. Identical content → identical class id, which means two
// nodes with the same responsive styling share the same generated rule. The
// browser dedups duplicate <style> tags' identical rules effectively; we lean
// on that rather than building a coordinated collector.
function hashContent(payload: unknown): string {
  const str = JSON.stringify(payload)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

export interface ResponsiveInlineResult {
  // Class name to add to the slot's composedClasses. Empty string when there's
  // no responsive entry — caller can keep the inline-style fast path.
  className: string
  // CSS rules to render inside a <style> tag. Empty when className is empty.
  css: string
  // True if the caller must SKIP setting style.inline[slot] on the React
  // element — base inline lives inside the generated class now to keep it
  // from beating the @media class via specificity.
  consumesBaseInline: boolean
}

const EMPTY: ResponsiveInlineResult = {
  className: '',
  css: '',
  consumesBaseInline: false,
}

// Computes the responsive-inline contribution for one slot of one node.
// - If the slot has no non-base inline (no responsive, no state), returns EMPTY
//   and the caller emits `style.inline[slot]` via the React style prop.
// - Otherwise promotes EVERY inline quadrant — base, responsive (@media),
//   state (`:hover`/`:focus`/`:active`), and bp×state (@media + pseudo) — into
//   one generated class. Base is promoted too (consumesBaseInline = true): an
//   inline-style attribute (specificity 1,0,0,0) would otherwise beat the
//   `.cls:hover` rule even while hovering, so base must live in the class for
//   the state rules to win.
//
// Phase 12 § 4.2 — extended from responsive-only to the full
// breakpoint × state matrix.
const STATE_ORDER = ['hover', 'focus', 'active'] as const

export function composeResponsiveInline(
  style: NodeStyle,
  slot: string,
): ResponsiveInlineResult {
  const base = style.inline?.[slot]

  // (bp, base state)
  const responsiveBySlot: Record<string, Record<string, string>> = {}
  for (const bp of BP_ORDER) {
    const entry = style.responsiveInline?.[bp]?.[slot]
    if (entry && Object.keys(entry).length > 0) responsiveBySlot[bp] = entry
  }
  // (base bp, state)
  const stateBySlot: Record<string, Record<string, string>> = {}
  for (const st of STATE_ORDER) {
    const entry = style.stateInline?.[st]?.[slot]
    if (entry && Object.keys(entry).length > 0) stateBySlot[st] = entry
  }
  // (bp, state)
  const stateResponsiveBySlot: Record<string, Record<string, Record<string, string>>> = {}
  for (const bp of BP_ORDER) {
    for (const st of STATE_ORDER) {
      const entry = style.stateResponsiveInline?.[bp]?.[st]?.[slot]
      if (entry && Object.keys(entry).length > 0) {
        ;(stateResponsiveBySlot[bp] ??= {})[st] = entry
      }
    }
  }

  const hasNonBase =
    Object.keys(responsiveBySlot).length > 0 ||
    Object.keys(stateBySlot).length > 0 ||
    Object.keys(stateResponsiveBySlot).length > 0
  if (!hasNonBase) return EMPTY

  const className = `ri-${hashContent({
    base: base ?? {},
    responsive: responsiveBySlot,
    states: stateBySlot,
    stateResponsive: stateResponsiveBySlot,
  })}`

  const rules: string[] = []
  // base (always-applied)
  if (base && Object.keys(base).length > 0) {
    rules.push(`.${className} { ${declarations(base)} }`)
  }
  // responsive @media
  for (const bp of BP_ORDER) {
    const r = responsiveBySlot[bp]
    if (!r) continue
    rules.push(
      `@media (min-width: ${BP_MIN_WIDTH[bp]}) { .${className} { ${declarations(r)} } }`,
    )
  }
  // pseudo-class state
  for (const st of STATE_ORDER) {
    const s = stateBySlot[st]
    if (!s) continue
    rules.push(`.${className}:${st} { ${declarations(s)} }`)
  }
  // bp × state (@media + pseudo)
  for (const bp of BP_ORDER) {
    const byState = stateResponsiveBySlot[bp]
    if (!byState) continue
    for (const st of STATE_ORDER) {
      const s = byState[st]
      if (!s) continue
      rules.push(
        `@media (min-width: ${BP_MIN_WIDTH[bp]}) { .${className}:${st} { ${declarations(s)} } }`,
      )
    }
  }

  return {
    className,
    css: rules.join('\n'),
    consumesBaseInline: true,
  }
}
