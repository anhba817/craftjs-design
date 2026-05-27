// Phase 12 § 4.11 — token-driven themes. A host passes a small set of
// base colors (often just `primary`); `deriveTokens` fills in the full
// shadcn core token set with sensible defaults, and `themeTokensToCss`
// renders the `[data-theme="…"]` block that `registerTheme` injects.
//
// Colors are plain CSS color strings — oklch(...) in the built-ins, but
// any valid CSS color works. The contrast-aware foreground selection
// here is a heuristic default; real WCAG contrast checking lands in
// Group E (§ 4.14).

export interface ThemeTokens {
  // The one required token — the brand / primary-action color.
  primary: string
  // Optional overrides. Anything omitted is derived below.
  primaryForeground?: string
  secondary?: string
  secondaryForeground?: string
  accent?: string
  accentForeground?: string
  muted?: string
  mutedForeground?: string
  background?: string
  foreground?: string
  border?: string
  input?: string
  ring?: string
  destructive?: string
  // Corner radius (e.g. '0.5rem'). Emitted as `--radius` only when set.
  radius?: string
}

// Parse the lightness (L, 0..1) out of an `oklch()` color. Returns null
// for any other color syntax — callers fall back to a safe default.
export function oklchLightness(color: string): number | null {
  const m = /^oklch\(\s*([0-9.]+)(%?)/i.exec(color.trim())
  if (!m) return null
  const n = parseFloat(m[1])
  if (!Number.isFinite(n)) return null
  return m[2] === '%' ? n / 100 : n
}

// Pick a readable foreground (near-black or near-white) for a background.
// Heuristic: oklch L > 0.6 reads as "light" → dark text, else light text.
// Non-oklch inputs default to light text. Group E replaces this with real
// contrast math.
export function contrastForeground(bg: string): string {
  const l = oklchLightness(bg)
  if (l == null) return 'oklch(0.985 0 0)'
  return l > 0.6 ? 'oklch(0.145 0 0)' : 'oklch(0.985 0 0)'
}

// Light-mode neutral defaults — match the project's :root in index.css.
const DEFAULTS = {
  background: 'oklch(1 0 0)',
  foreground: 'oklch(0.145 0 0)',
  secondary: 'oklch(0.97 0 0)',
  muted: 'oklch(0.97 0 0)',
  mutedForeground: 'oklch(0.556 0 0)',
  border: 'oklch(0.922 0 0)',
  destructive: 'oklch(0.577 0.245 27.325)',
} as const

/**
 * Derive the full core token set from a small base set. Pure: same input
 * → same output, no globals. Returns an ordered map keyed by CSS var name
 * (no leading `--`). Tokens the host didn't pass are filled from neutral
 * defaults or derived from related tokens (card = background, ring =
 * primary, `*-foreground` via the contrast heuristic). The sidebar brand
 * accents are kept in step with the theme — mirrors the built-in rose
 * block's convention.
 */
export function deriveTokens(t: ThemeTokens): Record<string, string> {
  const background = t.background ?? DEFAULTS.background
  const foreground = t.foreground ?? DEFAULTS.foreground
  const secondary = t.secondary ?? DEFAULTS.secondary
  const muted = t.muted ?? DEFAULTS.muted
  const accent = t.accent ?? secondary
  const border = t.border ?? DEFAULTS.border
  const ring = t.ring ?? t.primary
  const primaryForeground = t.primaryForeground ?? contrastForeground(t.primary)

  const out: Record<string, string> = {
    background,
    foreground,
    card: background,
    'card-foreground': foreground,
    popover: background,
    'popover-foreground': foreground,
    primary: t.primary,
    'primary-foreground': primaryForeground,
    secondary,
    'secondary-foreground': t.secondaryForeground ?? contrastForeground(secondary),
    muted,
    'muted-foreground': t.mutedForeground ?? DEFAULTS.mutedForeground,
    accent,
    'accent-foreground': t.accentForeground ?? contrastForeground(accent),
    destructive: t.destructive ?? DEFAULTS.destructive,
    border,
    input: t.input ?? border,
    ring,
    'sidebar-primary': t.primary,
    'sidebar-primary-foreground': primaryForeground,
    'sidebar-ring': ring,
  }
  if (t.radius) out.radius = t.radius
  return out
}

/**
 * Render a derived token map as a `[data-theme="…"]` CSS block. The
 * selector must be a non-empty data-theme value — what the ThemeProvider
 * sets on the canvas wrapper.
 */
export function themeTokensToCss(
  dataThemeValue: string,
  tokens: ThemeTokens,
): string {
  const derived = deriveTokens(tokens)
  const decls = Object.entries(derived)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join('\n')
  return `[data-theme="${dataThemeValue}"] {\n${decls}\n}`
}
