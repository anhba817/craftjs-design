import type { NodeStyle } from '@/registry/types'

// Phase 12 § 4.2 — the (breakpoint × state) matrix dispatch.
//
// Reads/writes for any single quadrant live here so useNodeClasses /
// useNodeClassesMulti stay dimension-agnostic (they just pass the
// active breakpoint + state). Composition (CanonicalNode) walks ALL
// quadrants and is in responsive.ts / responsive-inline.ts.
//
// Quadrant → storage:
//   (base, base)   classes[slot]                       inline[slot]
//   (bp,   base)   responsive[bp][slot]                responsiveInline[bp][slot]
//   (base, state)  states[state][slot]                 stateInline[state][slot]
//   (bp,   state)  stateResponsive[bp][state][slot]    stateResponsiveInline[bp][state][slot]

export type StyleState = 'base' | 'hover' | 'focus' | 'active'
export const STYLE_STATES: readonly StyleState[] = [
  'base',
  'hover',
  'focus',
  'active',
]
export const NON_BASE_STATES = ['hover', 'focus', 'active'] as const

// --- class string read/write -------------------------------------------------

export function readBucketClasses(
  style: NodeStyle | undefined,
  slot: string,
  bp: string,
  state: StyleState,
): string {
  // Tolerate nodes without a NodeStyle (Pattern B canvas slots like Table
  // cells are bare Craft Elements with no style shape; their selection
  // shouldn't crash the panels that happen to mount before filtering).
  if (!style) return ''
  if (state === 'base') {
    return bp === 'base'
      ? (style.classes?.[slot] ?? '')
      : (style.responsive?.[bp]?.[slot] ?? '')
  }
  return bp === 'base'
    ? (style.states?.[state]?.[slot] ?? '')
    : (style.stateResponsive?.[bp]?.[state]?.[slot] ?? '')
}

/** Write the class string into the right quadrant of an immer draft. */
export function writeBucketClasses(
  style: NodeStyle,
  slot: string,
  bp: string,
  state: StyleState,
  next: string,
): void {
  if (state === 'base') {
    if (bp === 'base') {
      style.classes[slot] = next
      return
    }
    if (!style.responsive) style.responsive = {}
    if (!style.responsive[bp]) style.responsive[bp] = {}
    style.responsive[bp][slot] = next
    return
  }
  if (bp === 'base') {
    if (!style.states) style.states = {}
    if (!style.states[state]) style.states[state] = {}
    style.states[state][slot] = next
    return
  }
  if (!style.stateResponsive) style.stateResponsive = {}
  if (!style.stateResponsive[bp]) style.stateResponsive[bp] = {}
  if (!style.stateResponsive[bp][state]) style.stateResponsive[bp][state] = {}
  style.stateResponsive[bp][state][slot] = next
}

// --- inline read/write (per CSS property) ------------------------------------

export function readBucketInline(
  style: NodeStyle | undefined,
  slot: string,
  bp: string,
  state: StyleState,
): Record<string, string> {
  if (!style) return {}
  if (state === 'base') {
    return bp === 'base'
      ? (style.inline?.[slot] ?? {})
      : (style.responsiveInline?.[bp]?.[slot] ?? {})
  }
  return bp === 'base'
    ? (style.stateInline?.[state]?.[slot] ?? {})
    : (style.stateResponsiveInline?.[bp]?.[state]?.[slot] ?? {})
}

/**
 * Set/clear one CSS property in the right inline quadrant of an immer
 * draft, peeling empty containers back when a value is cleared so the
 * saved document stays compact.
 */
export function writeBucketInline(
  style: NodeStyle,
  slot: string,
  bp: string,
  state: StyleState,
  cssProperty: string,
  value: string | undefined,
): void {
  // Resolve the slot-level map and a peel callback for each quadrant,
  // then share the set/delete logic.
  if (state === 'base' && bp === 'base') {
    setInlineLeaf(
      () => style.inline?.[slot],
      () => (style.inline ??= {})[slot] ??= {},
      cssProperty,
      value,
      () => {
        if (emptyObj(style.inline?.[slot])) delete style.inline![slot]
        if (emptyObj(style.inline)) delete style.inline
      },
    )
    return
  }
  if (state === 'base') {
    setInlineLeaf(
      () => style.responsiveInline?.[bp]?.[slot],
      () => {
        const ri = (style.responsiveInline ??= {})
        return (ri[bp] ??= {})[slot] ??= {}
      },
      cssProperty,
      value,
      () => {
        const bpMap = style.responsiveInline?.[bp]
        if (emptyObj(bpMap?.[slot])) delete bpMap![slot]
        if (emptyObj(bpMap)) delete style.responsiveInline![bp]
        if (emptyObj(style.responsiveInline)) delete style.responsiveInline
      },
    )
    return
  }
  if (bp === 'base') {
    setInlineLeaf(
      () => style.stateInline?.[state]?.[slot],
      () => {
        const si = (style.stateInline ??= {})
        return (si[state] ??= {})[slot] ??= {}
      },
      cssProperty,
      value,
      () => {
        const stMap = style.stateInline?.[state]
        if (emptyObj(stMap?.[slot])) delete stMap![slot]
        if (emptyObj(stMap)) delete style.stateInline![state]
        if (emptyObj(style.stateInline)) delete style.stateInline
      },
    )
    return
  }
  setInlineLeaf(
    () => style.stateResponsiveInline?.[bp]?.[state]?.[slot],
    () => {
      const sri = (style.stateResponsiveInline ??= {})
      const bpMap = (sri[bp] ??= {})
      return (bpMap[state] ??= {})[slot] ??= {}
    },
    cssProperty,
    value,
    () => {
      const bpMap = style.stateResponsiveInline?.[bp]
      const stMap = bpMap?.[state]
      if (emptyObj(stMap?.[slot])) delete stMap![slot]
      if (emptyObj(stMap)) delete bpMap![state]
      if (emptyObj(bpMap)) delete style.stateResponsiveInline![bp]
      if (emptyObj(style.stateResponsiveInline)) {
        delete style.stateResponsiveInline
      }
    },
  )
}

function emptyObj(o: Record<string, unknown> | undefined): boolean {
  return !o || Object.keys(o).length === 0
}

function setInlineLeaf(
  getLeaf: () => Record<string, string> | undefined,
  ensureLeaf: () => Record<string, string>,
  cssProperty: string,
  value: string | undefined,
  peel: () => void,
): void {
  if (value === undefined) {
    const leaf = getLeaf()
    if (!leaf) return
    delete leaf[cssProperty]
    peel()
    return
  }
  ensureLeaf()[cssProperty] = value
}
