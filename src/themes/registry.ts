import type { Theme, ThemeInput } from './types'
import { themeTokensToCss } from './tokens'

const themes = new Map<string, Theme>()

// Phase 12 § 4.11 — token CSS injection. Token-driven themes (those with
// a `tokens` map) get their `[data-theme="…"]` block generated and
// injected into a single shared <style> element, same mechanism as the
// font-token registry. CSS-only themes (the built-in 'rose', host-authored
// stylesheets) carry no tokens and contribute nothing here.
let injectedStyleEl: HTMLStyleElement | null = null

function ensureTokenStyleElement(): HTMLStyleElement | null {
  if (typeof document === 'undefined') return null
  if (!injectedStyleEl) {
    injectedStyleEl = document.createElement('style')
    injectedStyleEl.setAttribute('data-craftjs-theme-tokens', '')
    document.head.appendChild(injectedStyleEl)
  }
  return injectedStyleEl
}

function rebuildTokenStyleSheet(): void {
  const el = ensureTokenStyleElement()
  if (!el) return
  const blocks: string[] = []
  for (const theme of themes.values()) {
    if (theme.tokens && theme.dataThemeValue) {
      blocks.push(
        themeTokensToCss(theme.dataThemeValue, theme.tokens, theme.darkTokens),
      )
    }
  }
  el.textContent = blocks.join('\n\n')
}

// Phase 10 § 2.9 — hot-reload subscription. Same pattern as the
// font-token and adapter registries. Version increments on every
// register / unregister; ThemeSwitcher subscribes via
// useSyncExternalStore so post-mount registerTheme() calls update
// the dropdown without a remount.
let registryVersion = 0
const registryListeners = new Set<() => void>()

/**
 * Monotonically-increasing counter incremented on every theme registry
 * mutation (register or unregister). Consumed via `useSyncExternalStore`
 * by the ThemeSwitcher so post-mount registrations surface immediately.
 */
export function getThemeRegistryVersion(): number {
  return registryVersion
}

/** Subscribe to theme-registry version bumps. Returns an unsubscribe function. */
export function subscribeThemeRegistry(cb: () => void): () => void {
  registryListeners.add(cb)
  return () => {
    registryListeners.delete(cb)
  }
}

function bumpThemeRegistry(): void {
  registryVersion += 1
  for (const cb of registryListeners) cb()
}

/**
 * Register a theme. Throws on duplicate id; call `unregisterTheme(id)`
 * first to replace a built-in. Mutating the registry bumps the version
 * counter so the ThemeSwitcher picks up the change.
 *
 * Phase 12 § 4.11 — pass `tokens` to author a theme from a small set of
 * base colors; deriveTokens fills the full core token set and the
 * `[data-theme]` CSS block is generated + injected automatically.
 * `dataThemeValue` defaults to the id when omitted.
 */
export function registerTheme(input: ThemeInput): void {
  if (themes.has(input.id)) {
    throw new Error(`duplicate theme id: ${input.id}`)
  }
  const dataThemeValue = input.dataThemeValue ?? input.id
  if (input.tokens && !dataThemeValue) {
    throw new Error(`token theme "${input.id}" needs a non-empty dataThemeValue`)
  }
  const theme: Theme = {
    id: input.id,
    displayName: input.displayName,
    dataThemeValue,
    tokens: input.tokens,
    darkTokens: input.darkTokens,
  }
  themes.set(theme.id, theme)
  if (theme.tokens) rebuildTokenStyleSheet()
  bumpThemeRegistry()
}

/**
 * Register a theme, replacing any existing one with the same id. Used by
 * the visual theme editor for its live preview (re-upserted on every edit)
 * and for saving over an existing theme. Unlike registerTheme it never
 * throws on a duplicate id.
 */
export function upsertTheme(input: ThemeInput): void {
  if (themes.has(input.id)) unregisterTheme(input.id)
  registerTheme(input)
}

/**
 * Remove a theme by id. Returns `true` if a theme was removed,
 * `false` if the id wasn't registered.
 */
export function unregisterTheme(id: string): boolean {
  const existing = themes.get(id)
  const had = themes.delete(id)
  if (had) {
    if (existing?.tokens) rebuildTokenStyleSheet()
    bumpThemeRegistry()
  }
  return had
}

/** Look up a theme by id; returns `undefined` if not registered. */
export function getTheme(id: string): Theme | undefined {
  return themes.get(id)
}

/** All registered themes, in registration order. */
export function listThemes(): Theme[] {
  return [...themes.values()]
}
