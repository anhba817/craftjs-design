import { themeTokensToCss, type ThemeTokens } from './tokens'

// Phase 12 § 4.10 — shared bits for the visual theme editor. Kept separate
// from the React component so the slug/export logic stays pure + testable.

// Transient theme id used for the editor's live canvas preview. Hidden from
// the theme switcher (see ThemeSwitcher's `__`-prefix filter) and never
// persisted.
export const PREVIEW_THEME_ID = '__theme_preview'

// Turn a human theme name into a stable id / data-theme value.
export function slugifyThemeId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// The CSS a host would paste into their stylesheet to ship this theme
// without the SDK — light `[data-theme]` block + optional dark variant.
export function buildThemeCss(
  id: string,
  light: ThemeTokens,
  dark?: ThemeTokens,
): string {
  return themeTokensToCss(id, light, dark)
}
