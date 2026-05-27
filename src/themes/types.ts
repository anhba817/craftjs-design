import type { ThemeTokens } from './tokens'

export interface Theme {
  // Stable id stored in persisted documents (e.g. 'default', 'rose').
  id: string
  // Shown in the switcher UI.
  displayName: string
  // The value set on data-theme on the canvas wrapper. Empty string = no
  // attribute (use :root defaults).
  dataThemeValue: string
  // Phase 12 § 4.11 — when present, registerTheme derives the full core
  // token set from these and injects a `[data-theme="…"]` CSS block.
  // Themes defined purely via host CSS (e.g. the built-in 'rose') leave
  // this undefined.
  tokens?: ThemeTokens
}

// Input accepted by registerTheme. `dataThemeValue` defaults to the id
// when omitted (token themes rarely need a distinct selector); the
// empty-string form ('use :root defaults, no attribute') must be passed
// explicitly, as the built-in 'default' theme does.
export interface ThemeInput {
  id: string
  displayName: string
  dataThemeValue?: string
  tokens?: ThemeTokens
}
