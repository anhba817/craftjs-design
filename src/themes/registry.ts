import type { Theme } from './types'

const themes = new Map<string, Theme>()

export function registerTheme(theme: Theme): void {
  if (themes.has(theme.id)) {
    throw new Error(`duplicate theme id: ${theme.id}`)
  }
  themes.set(theme.id, theme)
}

export function getTheme(id: string): Theme | undefined {
  return themes.get(id)
}

export function listThemes(): Theme[] {
  return [...themes.values()]
}
