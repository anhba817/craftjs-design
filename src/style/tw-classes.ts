// Tailwind class string ↔ structured slices.
//
// Each slice owns a prefix family of utilities (typography handles text-*/font-*,
// spacing handles p-*/m-*, etc.) and exports a parse/serialize/merge trio.
//
// DISCIPLINE: anything that writes to a node's `style.classes.root` MUST funnel
// through a merge function in this file. Editing the class string elsewhere
// (string concat, manual splice, etc.) risks dropping classes the parser does
// not recognize.
//
// Const arrays at the top of each section are exported for two consumers:
//   1. Inspector panels — derive dropdown options from the arrays.
//   2. scripts/gen-safelist.ts — emit @source inline() directives so Tailwind's
//      JIT generates CSS for every utility the inspector can produce.

// ============================================================================
// Shared — token color enum (used by typography, appearance)
// ============================================================================

// shadcn-token color names that resolve to real CSS variables in our theme
// blocks. The safelist generates `text-`, `bg-`, `border-` × these. Inspector
// dropdowns may filter the list per slot (e.g., text rarely uses `card`).
export const COLORS = [
  'background', 'foreground',
  'card', 'card-foreground',
  'popover', 'popover-foreground',
  'primary', 'primary-foreground',
  'secondary', 'secondary-foreground',
  'muted', 'muted-foreground',
  'accent', 'accent-foreground',
  'destructive',
  'border', 'input', 'ring',
] as const
export type TokenColor = typeof COLORS[number]

// Pre-built alternation fragment for use inside regex bodies. Tokens with
// hyphens (`primary-foreground`) are literal in regex.
const COLOR_ALT = COLORS.join('|')

// ============================================================================
// Typography slice
// ============================================================================

export const FONT_SIZES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const
export const FONT_WEIGHTS = ['light', 'normal', 'medium', 'semibold', 'bold'] as const
export const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const

export type FontSize = typeof FONT_SIZES[number]
export type FontWeight = typeof FONT_WEIGHTS[number]
export type TextAlign = typeof TEXT_ALIGNS[number]
export type TextColor = TokenColor

export interface TypographySlice {
  fontSize?: FontSize
  fontWeight?: FontWeight
  textAlign?: TextAlign
  textColor?: TextColor
}

// Disambiguation note: `text-center` (align) and `text-foreground` (color) both
// share the `text-*` prefix but their value sets are disjoint.
const FONT_SIZE_RE = new RegExp(`^text-(${FONT_SIZES.join('|')})$`)
const FONT_WEIGHT_RE = new RegExp(`^font-(${FONT_WEIGHTS.join('|')})$`)
const TEXT_ALIGN_RE = new RegExp(`^text-(${TEXT_ALIGNS.join('|')})$`)
const TEXT_COLOR_RE = new RegExp(`^text-(${COLOR_ALT})$`)

export interface ParsedTypography {
  slice: TypographySlice
  unknownClasses: string[]
}

export function parseTypography(classString: string): ParsedTypography {
  const slice: TypographySlice = {}
  const unknownClasses: string[] = []
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    const sizeMatch = FONT_SIZE_RE.exec(cls)
    if (sizeMatch) { slice.fontSize = sizeMatch[1] as FontSize; continue }
    const weightMatch = FONT_WEIGHT_RE.exec(cls)
    if (weightMatch) { slice.fontWeight = weightMatch[1] as FontWeight; continue }
    const alignMatch = TEXT_ALIGN_RE.exec(cls)
    if (alignMatch) { slice.textAlign = alignMatch[1] as TextAlign; continue }
    const colorMatch = TEXT_COLOR_RE.exec(cls)
    if (colorMatch) { slice.textColor = colorMatch[1] as TextColor; continue }
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

export function mergeTypography(original: string, updates: Partial<TypographySlice>): string {
  const { slice, unknownClasses } = parseTypography(original)
  const merged: TypographySlice = { ...slice, ...updates }
  return [...unknownClasses, ...serializeTypography(merged)].join(' ')
}

// ============================================================================
// Layout slice
// ============================================================================

export const DISPLAYS = ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'hidden'] as const
export const FLEX_DIRS = ['row', 'col', 'row-reverse', 'col-reverse'] as const
export const ITEMS = ['start', 'center', 'end', 'stretch', 'baseline'] as const
export const JUSTIFY = ['start', 'center', 'end', 'between', 'around', 'evenly'] as const
export const GAPS = ['0', '1', '2', '3', '4', '6', '8', '12', '16'] as const

export type Display = typeof DISPLAYS[number]
export type FlexDir = typeof FLEX_DIRS[number]
export type AlignItems = typeof ITEMS[number]
export type JustifyContent = typeof JUSTIFY[number]
export type Gap = typeof GAPS[number]

export interface LayoutSlice {
  display?: Display
  flexDirection?: FlexDir
  alignItems?: AlignItems
  justifyContent?: JustifyContent
  gap?: Gap
}

// Display utilities are bare classes (no prefix). All listed values are
// disjoint with the other layout patterns.
const DISPLAY_RE = new RegExp(`^(${DISPLAYS.join('|')})$`)
const FLEX_DIR_RE = new RegExp(`^flex-(${FLEX_DIRS.join('|')})$`)
const ITEMS_RE = new RegExp(`^items-(${ITEMS.join('|')})$`)
const JUSTIFY_RE = new RegExp(`^justify-(${JUSTIFY.join('|')})$`)
const GAP_RE = new RegExp(`^gap-(${GAPS.join('|')})$`)

export interface ParsedLayout {
  slice: LayoutSlice
  unknownClasses: string[]
}

export function parseLayout(classString: string): ParsedLayout {
  const slice: LayoutSlice = {}
  const unknownClasses: string[] = []
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    const m1 = DISPLAY_RE.exec(cls)
    if (m1) { slice.display = m1[1] as Display; continue }
    const m2 = FLEX_DIR_RE.exec(cls)
    if (m2) { slice.flexDirection = m2[1] as FlexDir; continue }
    const m3 = ITEMS_RE.exec(cls)
    if (m3) { slice.alignItems = m3[1] as AlignItems; continue }
    const m4 = JUSTIFY_RE.exec(cls)
    if (m4) { slice.justifyContent = m4[1] as JustifyContent; continue }
    const m5 = GAP_RE.exec(cls)
    if (m5) { slice.gap = m5[1] as Gap; continue }
    unknownClasses.push(cls)
  }
  return { slice, unknownClasses }
}

export function serializeLayout(slice: LayoutSlice): string[] {
  const out: string[] = []
  if (slice.display) out.push(slice.display)
  if (slice.flexDirection) out.push(`flex-${slice.flexDirection}`)
  if (slice.alignItems) out.push(`items-${slice.alignItems}`)
  if (slice.justifyContent) out.push(`justify-${slice.justifyContent}`)
  if (slice.gap) out.push(`gap-${slice.gap}`)
  return out
}

export function mergeLayout(original: string, updates: Partial<LayoutSlice>): string {
  const { slice, unknownClasses } = parseLayout(original)
  const merged: LayoutSlice = { ...slice, ...updates }
  return [...unknownClasses, ...serializeLayout(merged)].join(' ')
}

// ============================================================================
// Spacing slice
// ============================================================================

export const SPACING_VALUES = ['0', '0.5', '1', '1.5', '2', '3', '4', '6', '8', '12', '16', '20', '24', '32'] as const
export type SpacingValue = typeof SPACING_VALUES[number]

// Prefixes drive 14 padding/margin fields. The serializer emits in this order
// to keep round-trips predictable.
export const SPACING_PREFIXES = ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml'] as const
type SpacingPrefix = typeof SPACING_PREFIXES[number]

export interface SpacingSlice {
  p?: SpacingValue; px?: SpacingValue; py?: SpacingValue
  pt?: SpacingValue; pr?: SpacingValue; pb?: SpacingValue; pl?: SpacingValue
  m?: SpacingValue; mx?: SpacingValue; my?: SpacingValue
  mt?: SpacingValue; mr?: SpacingValue; mb?: SpacingValue; ml?: SpacingValue
}

// Decimals require escaping in regex.
const SPACING_VALUE_ALT = SPACING_VALUES.map((v) => v.replace(/\./g, '\\.')).join('|')
const SPACING_RE = new RegExp(
  `^(${SPACING_PREFIXES.join('|')})-(${SPACING_VALUE_ALT})$`,
)

export interface ParsedSpacing {
  slice: SpacingSlice
  unknownClasses: string[]
}

export function parseSpacing(classString: string): ParsedSpacing {
  const slice: SpacingSlice = {}
  const unknownClasses: string[] = []
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    const m = SPACING_RE.exec(cls)
    if (m) {
      slice[m[1] as SpacingPrefix] = m[2] as SpacingValue
      continue
    }
    unknownClasses.push(cls)
  }
  return { slice, unknownClasses }
}

export function serializeSpacing(slice: SpacingSlice): string[] {
  const out: string[] = []
  for (const prefix of SPACING_PREFIXES) {
    const value = slice[prefix]
    if (value) out.push(`${prefix}-${value}`)
  }
  return out
}

export function mergeSpacing(original: string, updates: Partial<SpacingSlice>): string {
  const { slice, unknownClasses } = parseSpacing(original)
  const merged: SpacingSlice = { ...slice, ...updates }
  return [...unknownClasses, ...serializeSpacing(merged)].join(' ')
}

// ============================================================================
// Size slice
// ============================================================================

export const SIZE_VALUES = [
  'auto', 'full',
  '1/2', '1/3', '2/3', '1/4', '3/4',
  '0', '8', '12', '16', '24', '32', '48', '64', '96', '128',
] as const
export type SizeValue = typeof SIZE_VALUES[number]

export const SIZE_PREFIXES = ['w', 'h', 'min-w', 'min-h', 'max-w', 'max-h'] as const
type SizePrefix = typeof SIZE_PREFIXES[number]

export interface SizeSlice {
  w?: SizeValue; h?: SizeValue
  'min-w'?: SizeValue; 'min-h'?: SizeValue
  'max-w'?: SizeValue; 'max-h'?: SizeValue
}

const SIZE_RE = new RegExp(
  `^(${SIZE_PREFIXES.join('|')})-(${SIZE_VALUES.join('|')})$`,
)

export interface ParsedSize {
  slice: SizeSlice
  unknownClasses: string[]
}

export function parseSize(classString: string): ParsedSize {
  const slice: SizeSlice = {}
  const unknownClasses: string[] = []
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    const m = SIZE_RE.exec(cls)
    if (m) {
      slice[m[1] as SizePrefix] = m[2] as SizeValue
      continue
    }
    unknownClasses.push(cls)
  }
  return { slice, unknownClasses }
}

export function serializeSize(slice: SizeSlice): string[] {
  const out: string[] = []
  for (const prefix of SIZE_PREFIXES) {
    const value = slice[prefix]
    if (value) out.push(`${prefix}-${value}`)
  }
  return out
}

export function mergeSize(original: string, updates: Partial<SizeSlice>): string {
  const { slice, unknownClasses } = parseSize(original)
  const merged: SizeSlice = { ...slice, ...updates }
  return [...unknownClasses, ...serializeSize(merged)].join(' ')
}

// ============================================================================
// Appearance slice — bg + border (width/style/color) + radius
// ============================================================================

export const BORDER_WIDTHS = ['0', '2', '4', '8'] as const
export const BORDER_STYLES = ['solid', 'dashed', 'dotted'] as const
export const RADII = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'] as const

export type BorderWidth = typeof BORDER_WIDTHS[number] | 'default'
export type BorderStyle = typeof BORDER_STYLES[number]
export type Radius = typeof RADII[number] | 'default'

export interface AppearanceSlice {
  bg?: TokenColor
  borderWidth?: BorderWidth     // 'default' serializes as bare `border`
  borderStyle?: BorderStyle
  borderColor?: TokenColor
  rounded?: Radius              // 'default' serializes as bare `rounded`
}

const BG_RE = new RegExp(`^bg-(${COLOR_ALT})$`)
// Border width: `border` (bare → 'default') or `border-{0|2|4|8}`. The
// `border-{1}` form isn't standard Tailwind; '1px' is the default `border`.
const BORDER_WIDTH_RE = new RegExp(`^border(?:-(${BORDER_WIDTHS.join('|')}))?$`)
const BORDER_STYLE_RE = new RegExp(`^border-(${BORDER_STYLES.join('|')})$`)
const BORDER_COLOR_RE = new RegExp(`^border-(${COLOR_ALT})$`)
// Radius: `rounded` (bare → 'default') or `rounded-{...}`.
const ROUNDED_RE = new RegExp(`^rounded(?:-(${RADII.join('|')}))?$`)

export interface ParsedAppearance {
  slice: AppearanceSlice
  unknownClasses: string[]
}

export function parseAppearance(classString: string): ParsedAppearance {
  const slice: AppearanceSlice = {}
  const unknownClasses: string[] = []
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    const bg = BG_RE.exec(cls)
    if (bg) { slice.bg = bg[1] as TokenColor; continue }
    // Style first (closed enum, no overlap with color/width).
    const style = BORDER_STYLE_RE.exec(cls)
    if (style) { slice.borderStyle = style[1] as BorderStyle; continue }
    // Width before color: bare `border` matches width regex (group undefined →
    // 'default'); `border-2` matches width regex. Color regex won't match these.
    const width = BORDER_WIDTH_RE.exec(cls)
    if (width) {
      slice.borderWidth = (width[1] ?? 'default') as BorderWidth
      continue
    }
    const color = BORDER_COLOR_RE.exec(cls)
    if (color) { slice.borderColor = color[1] as TokenColor; continue }
    const rounded = ROUNDED_RE.exec(cls)
    if (rounded) {
      slice.rounded = (rounded[1] ?? 'default') as Radius
      continue
    }
    unknownClasses.push(cls)
  }
  return { slice, unknownClasses }
}

export function serializeAppearance(slice: AppearanceSlice): string[] {
  const out: string[] = []
  if (slice.bg) out.push(`bg-${slice.bg}`)
  if (slice.borderWidth) {
    out.push(slice.borderWidth === 'default' ? 'border' : `border-${slice.borderWidth}`)
  }
  if (slice.borderStyle) out.push(`border-${slice.borderStyle}`)
  if (slice.borderColor) out.push(`border-${slice.borderColor}`)
  if (slice.rounded) {
    out.push(slice.rounded === 'default' ? 'rounded' : `rounded-${slice.rounded}`)
  }
  return out
}

export function mergeAppearance(original: string, updates: Partial<AppearanceSlice>): string {
  const { slice, unknownClasses } = parseAppearance(original)
  const merged: AppearanceSlice = { ...slice, ...updates }
  return [...unknownClasses, ...serializeAppearance(merged)].join(' ')
}

// ============================================================================
// Effects slice — shadow / opacity / blur
// ============================================================================

export const SHADOWS = ['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'] as const
export const OPACITIES = ['0', '25', '50', '75', '100'] as const
export const BLURS = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const

export type Shadow = typeof SHADOWS[number] | 'default'
export type Opacity = typeof OPACITIES[number]
export type Blur = typeof BLURS[number] | 'default'

export interface EffectsSlice {
  shadow?: Shadow    // 'default' serializes as bare `shadow`
  opacity?: Opacity
  blur?: Blur        // 'default' serializes as bare `blur`
}

const SHADOW_RE = new RegExp(`^shadow(?:-(${SHADOWS.join('|')}))?$`)
const OPACITY_RE = new RegExp(`^opacity-(${OPACITIES.join('|')})$`)
const BLUR_RE = new RegExp(`^blur(?:-(${BLURS.join('|')}))?$`)

export interface ParsedEffects {
  slice: EffectsSlice
  unknownClasses: string[]
}

export function parseEffects(classString: string): ParsedEffects {
  const slice: EffectsSlice = {}
  const unknownClasses: string[] = []
  for (const cls of classString.split(/\s+/).filter(Boolean)) {
    const shadow = SHADOW_RE.exec(cls)
    if (shadow) { slice.shadow = (shadow[1] ?? 'default') as Shadow; continue }
    const opacity = OPACITY_RE.exec(cls)
    if (opacity) { slice.opacity = opacity[1] as Opacity; continue }
    const blur = BLUR_RE.exec(cls)
    if (blur) { slice.blur = (blur[1] ?? 'default') as Blur; continue }
    unknownClasses.push(cls)
  }
  return { slice, unknownClasses }
}

export function serializeEffects(slice: EffectsSlice): string[] {
  const out: string[] = []
  if (slice.shadow) {
    out.push(slice.shadow === 'default' ? 'shadow' : `shadow-${slice.shadow}`)
  }
  if (slice.opacity) out.push(`opacity-${slice.opacity}`)
  if (slice.blur) {
    out.push(slice.blur === 'default' ? 'blur' : `blur-${slice.blur}`)
  }
  return out
}

export function mergeEffects(original: string, updates: Partial<EffectsSlice>): string {
  const { slice, unknownClasses } = parseEffects(original)
  const merged: EffectsSlice = { ...slice, ...updates }
  return [...unknownClasses, ...serializeEffects(merged)].join(' ')
}
