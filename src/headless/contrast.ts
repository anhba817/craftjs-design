// Phase 22 Group A — deterministic color/contrast analysis (no browser, no
// new dependency). Gives an MCP agent color awareness it otherwise lacks:
//   - analyzeThemeContrast(theme, mode): the theme's semantic token pairs
//     (body text, muted text, primary button, …) → WCAG ratio + grade.
//   - analyzeDocumentContrast(doc): per text node, the effective foreground /
//     background TOKEN colors (threading inheritance through the tree) → ratio
//     + grade, flagging nodes whose colors can't be resolved statically.
//
// Reuses the editor's pure WCAG math (contrast.ts) + the theme token
// derivation (themes/tokens.ts). Statically resolving the full Tailwind
// cascade is impossible, so this is honest-best-effort: it resolves the
// editor's semantic token utilities (text-foreground, bg-card, …) and flags
// everything else (literal grays, arbitrary values, gradients) as
// "indeterminate — use render_image / check_contrast" rather than guessing.
import {
  contrastGrade,
  contrastRatio,
  oklchToRgb,
  type ContrastGrade,
} from '@/editor/inspector/shared/contrast'
import { hexToRgb, normalizeHex, parseOklch, type Rgb } from '@/editor/inspector/shared/color-conversions'
import { deriveTokens, type ColorScheme, type ThemeTokens } from '@/themes/tokens'
import { getTheme } from '@/themes/registry'
import type { EditorDocument } from '@/persistence/schema'
import type { SerializedCraftNode, SerializedNodeMap } from './build'

// The built-in 'default' theme has no token map (its colors live in index.css
// :root / .dark). Mirror those base values so it resolves like any token
// theme. Pinned by a test against deriveTokens output.
const DEFAULT_LIGHT: ThemeTokens = { primary: 'oklch(0.205 0 0)' }
const DEFAULT_DARK: ThemeTokens = {
  primary: 'oklch(0.922 0 0)',
  primaryForeground: 'oklch(0.205 0 0)',
}

/** Parse a CSS color string (oklch / hex / rgb) to sRGB — pure, DOM-free. */
export function parseColor(css: string): Rgb | null {
  const v = css.trim()
  const hex = normalizeHex(v)
  if (hex) return hexToRgb(hex)
  if (/^oklch\(/i.test(v)) {
    const o = parseOklch(v)
    return o ? oklchToRgb(o.l, o.c, o.h) : null
  }
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(v)
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }
  return null
}

function schemeOf(mode: EditorDocument['colorMode']): ColorScheme {
  // 'system' is non-deterministic at analysis time → assume light (noted).
  return mode === 'dark' ? 'dark' : 'light'
}

/** Resolve a theme + color mode to its token colors (token name → sRGB). */
export function resolveThemePalette(
  themeId: string | undefined,
  mode: EditorDocument['colorMode'],
): Record<string, Rgb> {
  const theme = (themeId ? getTheme(themeId) : undefined) ?? getTheme('default')
  const scheme = schemeOf(mode)
  let base: ThemeTokens
  if (theme?.tokens) {
    base = scheme === 'dark' ? (theme.darkTokens ?? theme.tokens) : theme.tokens
  } else {
    base = scheme === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT
  }
  const derived = deriveTokens(base, scheme)
  const palette: Record<string, Rgb> = {}
  for (const [name, css] of Object.entries(derived)) {
    const rgb = parseColor(css)
    if (rgb) palette[name] = rgb
  }
  return palette
}

export interface ContrastPair {
  /** Human label, e.g. "body text", "primary button". */
  label: string
  foreground: string // token name
  background: string // token name
  ratio: number
  grade: ContrastGrade
}

// The semantic pairs that matter for legibility, by token name.
const SEMANTIC_PAIRS: { label: string; fg: string; bg: string }[] = [
  { label: 'body text', fg: 'foreground', bg: 'background' },
  { label: 'muted text', fg: 'muted-foreground', bg: 'background' },
  { label: 'card text', fg: 'card-foreground', bg: 'card' },
  { label: 'primary button', fg: 'primary-foreground', bg: 'primary' },
  { label: 'secondary', fg: 'secondary-foreground', bg: 'secondary' },
  { label: 'accent', fg: 'accent-foreground', bg: 'accent' },
  { label: 'destructive text', fg: 'destructive', bg: 'background' },
]

export interface ThemeContrastReport {
  themeId: string
  /** The color scheme actually analyzed ('system' resolves to 'light' here). */
  scheme: ColorScheme
  pairs: ContrastPair[]
}

/** WCAG ratios for a theme's key semantic token pairs. */
export function analyzeThemeContrast(
  themeId: string | undefined,
  mode: EditorDocument['colorMode'] = 'light',
): ThemeContrastReport {
  const theme = (themeId ? getTheme(themeId) : undefined) ?? getTheme('default')
  const palette = resolveThemePalette(themeId, mode)
  const pairs: ContrastPair[] = []
  for (const p of SEMANTIC_PAIRS) {
    const fg = palette[p.fg]
    const bg = palette[p.bg]
    if (!fg || !bg) continue
    const ratio = contrastRatio(fg, bg)
    pairs.push({
      label: p.label,
      foreground: p.fg,
      background: p.bg,
      ratio: Math.round(ratio * 100) / 100,
      grade: contrastGrade(ratio),
    })
  }
  return { themeId: theme?.id ?? 'default', scheme: schemeOf(mode), pairs }
}

// ---- per-document analysis ------------------------------------------------

// Token names that can appear as `text-<name>` / `bg-<name>` utilities.
const TOKEN_NAMES = new Set([
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
])

// A literal/arbitrary color utility we can't statically resolve to a token.
const NON_TOKEN_COLOR =
  /(?:^|[\s])(?:text|bg)-(?:white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-|(?:text|bg)-\[/

// Extract a token name from the last matching `text-<token>` / `bg-<token>`
// utility in a class string (later utilities win, loosely mirroring the
// cascade). Returns undefined when none present.
function tokenUtility(classes: string, prefix: 'text' | 'bg'): string | undefined {
  let found: string | undefined
  const re = new RegExp(`(?:^|\\s)${prefix}-([a-z-]+)`, 'g')
  for (let m = re.exec(classes); m; m = re.exec(classes)) {
    if (TOKEN_NAMES.has(m[1])) found = m[1]
  }
  return found
}

const TEXT_PROP_KEYS = ['content', 'label', 'text']

export interface NodeContrast {
  nodeId: string
  canonical: string
  foreground?: string // token name
  background?: string // token name
  ratio?: number
  grade?: ContrastGrade
  /** Set when a color couldn't be resolved statically (literal/arbitrary). */
  indeterminate?: boolean
  note?: string
}

export interface DocumentContrastReport {
  scheme: ColorScheme
  /** Only nodes that carry text. */
  nodes: NodeContrast[]
}

/**
 * Best-effort per-text-node contrast: threads effective foreground/background
 * TOKEN colors through the tree (a node inherits its ancestors' text/bg token
 * unless it sets its own), then grades text-bearing nodes. Nodes whose color
 * is a literal/arbitrary value (text-gray-700, text-[#…], gradients) are
 * flagged `indeterminate` — resolve those with render_image / check_contrast.
 */
export function analyzeDocumentContrast(
  doc: EditorDocument,
): DocumentContrastReport {
  let nodes: SerializedNodeMap
  try {
    nodes = JSON.parse(doc.craftJson) as SerializedNodeMap
  } catch {
    return { scheme: schemeOf(doc.colorMode), nodes: [] }
  }
  const palette = resolveThemePalette(doc.themeId, doc.colorMode)
  const scheme = schemeOf(doc.colorMode)
  const out: NodeContrast[] = []

  const classesOf = (node: SerializedCraftNode): string => {
    const style = node.props?.style as { classes?: Record<string, string> } | undefined
    return Object.values(style?.classes ?? {}).join(' ')
  }
  const canonicalOf = (node: SerializedCraftNode): string =>
    (typeof node.props?.canonicalId === 'string' && node.props.canonicalId) ||
    (typeof node.type === 'string' ? node.type : node.type.resolvedName)
  const isTexty = (node: SerializedCraftNode): boolean => {
    const np = (node.props?.nodeProps ?? {}) as Record<string, unknown>
    return TEXT_PROP_KEYS.some((k) => typeof np[k] === 'string' && np[k])
  }

  const walk = (
    id: string,
    inheritedFg: string,
    inheritedBg: string,
  ): void => {
    const node = nodes[id]
    if (!node) return
    const classes = classesOf(node)
    const ownFg = tokenUtility(classes, 'text')
    const ownBg = tokenUtility(classes, 'bg')
    const fg = ownFg ?? inheritedFg
    const bg = ownBg ?? inheritedBg

    if (typeof node.type !== 'string' && isTexty(node)) {
      const literalColor = NON_TOKEN_COLOR.test(` ${classes}`)
      const fgRgb = palette[fg]
      const bgRgb = palette[bg]
      if (literalColor || !fgRgb || !bgRgb) {
        out.push({
          nodeId: id,
          canonical: canonicalOf(node),
          indeterminate: true,
          note: literalColor
            ? 'uses a literal/arbitrary color — render_image to verify'
            : 'color not statically resolvable — render_image to verify',
        })
      } else {
        const ratio = contrastRatio(fgRgb, bgRgb)
        out.push({
          nodeId: id,
          canonical: canonicalOf(node),
          foreground: fg,
          background: bg,
          ratio: Math.round(ratio * 100) / 100,
          grade: contrastGrade(ratio),
        })
      }
    }

    for (const child of node.nodes ?? []) walk(child, fg, bg)
    for (const linked of Object.values(node.linkedNodes ?? {})) {
      walk(linked, fg, bg)
    }
  }

  walk('ROOT', 'foreground', 'background')
  return { scheme, nodes: out }
}
