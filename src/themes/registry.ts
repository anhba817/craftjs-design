import type { Theme } from './types'

const themes = new Map<string, Theme>()

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
 */
export function registerTheme(theme: Theme): void {
  if (themes.has(theme.id)) {
    throw new Error(`duplicate theme id: ${theme.id}`)
  }
  themes.set(theme.id, theme)
  bumpThemeRegistry()
}

/**
 * Remove a theme by id. Returns `true` if a theme was removed,
 * `false` if the id wasn't registered.
 */
export function unregisterTheme(id: string): boolean {
  const had = themes.delete(id)
  if (had) bumpThemeRegistry()
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
