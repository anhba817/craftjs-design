import type { ReactNode } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { getTheme } from './registry'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useEditorStore((s) => s.activeThemeId)
  const theme = getTheme(themeId) ?? getTheme('default')
  // Empty-string dataThemeValue → no attribute → :root defaults apply.
  const dataTheme = theme?.dataThemeValue || undefined

  // display: contents keeps the wrapper transparent to layout (so flex-1
  // children remain flex items of the outer container) while still putting
  // data-theme into the DOM hierarchy — CSS custom-property inheritance
  // follows the DOM tree, not the rendering tree.
  return (
    <div data-theme={dataTheme} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
