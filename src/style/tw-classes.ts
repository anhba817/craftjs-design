// Tailwind class string ↔ structured slices.
//
// Phase 2 ships only the typography slice; Phase 4 will extend the same file
// with layout / spacing / fill / border / radius / effects slices.
//
// DISCIPLINE: anything that writes to a node's `style.classes.root` MUST funnel
// through a merge function in this file. Editing the class string elsewhere
// (string concat, manual splice, etc.) risks dropping classes the parser does
// not recognize.

export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
export type FontWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'
export type TextColor =
  | 'foreground'
  | 'primary'
  | 'secondary'
  | 'muted-foreground'
  | 'destructive'
  | 'accent-foreground'

export interface TypographySlice {
  fontSize?: FontSize
  fontWeight?: FontWeight
  textAlign?: TextAlign
  textColor?: TextColor
}

// Strict prefix-based recognition. Anything that doesn't match passes through
// as an "unknown" class — the inspector preserves these on merge.
//
// Disambiguation note: `text-center` (align) and `text-foreground` (color) both
// share the `text-*` prefix but their value sets are disjoint, so the regexes
// don't conflict regardless of order.
const FONT_SIZE_RE = /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/
const FONT_WEIGHT_RE = /^font-(light|normal|medium|semibold|bold)$/
const TEXT_ALIGN_RE = /^text-(left|center|right|justify)$/
const TEXT_COLOR_RE =
  /^text-(foreground|primary|secondary|muted-foreground|destructive|accent-foreground)$/

export interface ParsedTypography {
  slice: TypographySlice
  unknownClasses: string[]
}

export function parseTypography(classString: string): ParsedTypography {
  const slice: TypographySlice = {}
  const unknownClasses: string[] = []
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    const sizeMatch = FONT_SIZE_RE.exec(cls)
    if (sizeMatch) {
      slice.fontSize = sizeMatch[1] as FontSize
      continue
    }
    const weightMatch = FONT_WEIGHT_RE.exec(cls)
    if (weightMatch) {
      slice.fontWeight = weightMatch[1] as FontWeight
      continue
    }
    const alignMatch = TEXT_ALIGN_RE.exec(cls)
    if (alignMatch) {
      slice.textAlign = alignMatch[1] as TextAlign
      continue
    }
    const colorMatch = TEXT_COLOR_RE.exec(cls)
    if (colorMatch) {
      slice.textColor = colorMatch[1] as TextColor
      continue
    }
    unknownClasses.push(cls)
  }
  return { slice, unknownClasses }
}

export function serializeTypography(slice: TypographySlice): string[] {
  const out: string[] = []
  if (slice.fontSize) out.push(`text-${slice.fontSize}`)
  if (slice.fontWeight) out.push(`font-${slice.fontWeight}`)
  if (slice.textAlign) out.push(`text-${slice.textAlign}`)
  if (slice.textColor) out.push(`text-${slice.textColor}`)
  return out
}

// Patch-friendly merge: the caller passes only the fields they want to change.
// Unknown classes pass through; typography fields not in `updates` retain
// whatever the original class string had.
export function mergeTypography(
  original: string,
  updates: Partial<TypographySlice>,
): string {
  const { slice, unknownClasses } = parseTypography(original)
  const merged: TypographySlice = { ...slice, ...updates }
  return [...unknownClasses, ...serializeTypography(merged)].join(' ')
}
