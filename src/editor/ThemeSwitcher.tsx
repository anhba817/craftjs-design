import { useMemo, useSyncExternalStore } from 'react'
import { useEditorStore } from '@/state/editorStore'
import {
  getThemeRegistryVersion,
  listThemes,
  subscribeThemeRegistry,
} from '@/themes/registry'

export function ThemeSwitcher() {
  const activeThemeId = useEditorStore((s) => s.activeThemeId)
  const setActiveTheme = useEditorStore((s) => s.setActiveTheme)
  // Phase 10 § 2.9 — subscribe to theme-registry version bumps so
  // post-mount registerTheme() calls update this dropdown.
  const version = useSyncExternalStore(
    subscribeThemeRegistry,
    getThemeRegistryVersion,
    getThemeRegistryVersion,
  )
  // Hide transient `__`-prefixed themes (the theme editor's live preview).
  const themes = useMemo(
    () => listThemes().filter((t) => !t.id.startsWith('__')),
    [version],
  )

  return (
    <label className="flex items-center gap-1.5 text-xs text-ed-text-muted">
      <span className="font-semibold tracking-wide uppercase text-ed-text-muted">Theme</span>
      <select
        value={activeThemeId}
        onChange={(e) => setActiveTheme(e.target.value)}
        className="rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text hover:bg-ed-surface-2"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.displayName}
          </option>
        ))}
      </select>
    </label>
  )
}
