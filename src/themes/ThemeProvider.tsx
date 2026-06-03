import type { ReactNode } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { useEffectiveColorScheme } from './colorMode'
import { getTheme } from './registry'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useEditorStore((s) => s.activeThemeId)
  const theme = getTheme(themeId) ?? getTheme('default')
  // Empty-string dataThemeValue → no attribute → :root defaults apply.
  const dataTheme = theme?.dataThemeValue || undefined

  // Phase 12 § 4.13 — `.dark` on the same wrapper drives both the global
  // `.dark { … }` block (default theme) and per-theme `.dark[data-theme]`
  // variant blocks (token themes with darkTokens). The `@custom-variant
  // dark (&:is(.dark *))` in index.css also flips `dark:` utilities on
  // canvas descendants.
  const scheme = useEffectiveColorScheme()

  // display: contents keeps the wrapper transparent to layout (so flex-1
  // children remain flex items of the outer container) while still putting
  // data-theme into the DOM hierarchy — CSS custom-property inheritance
  // follows the DOM tree, not the rendering tree.
  return (
    // `cd-canvas` is a stable hook for chrome-vs-canvas CSS scoping (the
    // data-theme attribute is absent for the default theme, so it can't be
    // the hook). Phase 19 uses it to keep the document's `color-scheme`
    // independent of a dark editor chrome.
    <div
      data-theme={dataTheme}
      className={scheme === 'dark' ? 'cd-canvas dark' : 'cd-canvas'}
      style={{ display: 'contents' }}
    >
      {children}
    </div>
  )
}
