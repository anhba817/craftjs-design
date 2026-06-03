// Phase 19 Group C — editor-chrome theme resolution (pure, DOM-free).
//
// The HOST themes the editor chrome (toolbox, inspector, toolbar, panels,
// banners) via the `editorTheme` prop — a built-in preset name or a partial
// token map. This is deliberately NOT the document theme system
// (`registerTheme` / ThemeSwitcher / `colorMode` style the CANVAS content
// that end users design); the two are independent, so a host can put dark
// chrome around a light document, Figma-style.
//
// Tokens resolve as CSS variables: the presets are authored in
// `src/index.css` (`:root` = light, `[data-editor-theme='dark']` = dark);
// a host token map becomes inline `--ed-*` variables layered on top of the
// chosen preset. `resolveChromeTheme` is pure so the mapping is unit-testable
// without a DOM; `Editor` applies the result.

/**
 * Partial editor-chrome token map. Every value is a CSS color (any syntax —
 * hex, `oklch(…)`, `var(--host-token)`). Omitted tokens fall back to the
 * `preset` (default `'light'`).
 *
 * Token roles:
 * - `surface` — panel/toolbar background (light: white)
 * - `surface2` — subtle inset/hover background (light: gray-50)
 * - `surface3` — stronger inset/active background, canvas viewport
 *   (light: gray-100)
 * - `border` / `border2` / `borderStrong` — hairline → input → emphasized
 *   borders (light: gray-200/300/400)
 * - `textStrong` / `text` / `textMuted` / `textFaint` — heading → body →
 *   secondary → disabled text (light: gray-800/700/500/400)
 * - `accent` / `accentFg` — selected states, focus rings, primary chrome
 *   buttons, canvas selection outlines, and the text on top of `accent`
 * - `danger` / `dangerFg` — destructive actions and error banners, and the
 *   text on top of `danger`
 */
export interface EditorChromeTokens {
  /** Built-in preset the overrides extend. Default `'light'`. */
  preset?: 'light' | 'dark'
  surface?: string
  surface2?: string
  surface3?: string
  border?: string
  border2?: string
  borderStrong?: string
  textStrong?: string
  text?: string
  textMuted?: string
  textFaint?: string
  accent?: string
  accentFg?: string
  danger?: string
  dangerFg?: string
}

/** The `editorTheme` prop: a preset name or a partial token map. */
export type EditorChromeTheme = 'light' | 'dark' | EditorChromeTokens

// Token key → CSS custom property. Single source of truth for the mapping;
// the variable names are public API (documented in INTEGRATION_GUIDE), so
// renaming one is a breaking change.
const TOKEN_VARS = {
  surface: '--ed-surface',
  surface2: '--ed-surface-2',
  surface3: '--ed-surface-3',
  border: '--ed-border',
  border2: '--ed-border-2',
  borderStrong: '--ed-border-strong',
  textStrong: '--ed-text-strong',
  text: '--ed-text',
  textMuted: '--ed-text-muted',
  textFaint: '--ed-text-faint',
  accent: '--ed-accent',
  accentFg: '--ed-accent-fg',
  danger: '--ed-danger',
  dangerFg: '--ed-danger-fg',
} as const satisfies Record<keyof Omit<EditorChromeTokens, 'preset'>, string>

export interface ResolvedChromeTheme {
  /** Value for the `data-editor-theme` attribute (selects the preset CSS). */
  preset: 'light' | 'dark'
  /** Inline `--ed-*` overrides layered on top of the preset. */
  vars: Record<string, string>
}

export function resolveChromeTheme(
  theme: EditorChromeTheme | undefined,
): ResolvedChromeTheme {
  if (theme === undefined || typeof theme === 'string') {
    return { preset: theme ?? 'light', vars: {} }
  }
  const vars: Record<string, string> = {}
  for (const [key, cssVar] of Object.entries(TOKEN_VARS) as Array<
    [keyof typeof TOKEN_VARS, string]
  >) {
    const value = theme[key]
    if (value !== undefined) vars[cssVar] = value
  }
  return { preset: theme.preset ?? 'light', vars }
}
