import { describe, expect, it } from 'vitest'
import { resolveColorScheme } from './colorMode'
import { buildThemeCss, slugifyThemeId } from './editor'
import { deriveTokens, themeTokensToCss } from './tokens'

describe('deriveTokens — dark scheme defaults', () => {
  it('fills dark neutrals (dark bg, light fg)', () => {
    const t = deriveTokens({ primary: 'oklch(0.9 0 0)' }, 'dark')
    expect(t.background).toBe('oklch(0.145 0 0)')
    expect(t.foreground).toBe('oklch(0.985 0 0)')
    expect(t.card).toBe('oklch(0.145 0 0)')
  })
  it('light scheme still uses light neutrals (default)', () => {
    const t = deriveTokens({ primary: 'oklch(0.5 0 0)' })
    expect(t.background).toBe('oklch(1 0 0)')
    expect(t.foreground).toBe('oklch(0.145 0 0)')
  })
  it('explicit overrides still win in dark', () => {
    const t = deriveTokens(
      { primary: 'oklch(0.9 0 0)', background: 'oklch(0.2 0.05 250)' },
      'dark',
    )
    expect(t.background).toBe('oklch(0.2 0.05 250)')
  })
})

describe('themeTokensToCss — dark variant block', () => {
  it('emits only the light block when no darkTokens', () => {
    const css = themeTokensToCss('blue', { primary: 'oklch(0.6 0.2 250)' })
    expect(css).toContain('[data-theme="blue"] {')
    expect(css).not.toContain('.dark[data-theme="blue"]')
  })
  it('emits a .dark[data-theme] block when darkTokens given', () => {
    const css = themeTokensToCss(
      'blue',
      { primary: 'oklch(0.6 0.2 250)' },
      { primary: 'oklch(0.7 0.2 250)' },
    )
    expect(css).toContain('[data-theme="blue"] {')
    expect(css).toContain('.dark[data-theme="blue"] {')
    // dark block carries the dark background default
    const darkPart = css.slice(css.indexOf('.dark[data-theme="blue"]'))
    expect(darkPart).toContain('--background: oklch(0.145 0 0);')
  })
})

describe('resolveColorScheme', () => {
  it('explicit modes pass through', () => {
    expect(resolveColorScheme('light', true)).toBe('light')
    expect(resolveColorScheme('dark', false)).toBe('dark')
  })
  it('system defers to OS preference', () => {
    expect(resolveColorScheme('system', true)).toBe('dark')
    expect(resolveColorScheme('system', false)).toBe('light')
  })
})

describe('slugifyThemeId', () => {
  it('lowercases + hyphenates', () => {
    expect(slugifyThemeId('My Cool Theme')).toBe('my-cool-theme')
  })
  it('strips leading/trailing/duplicate separators', () => {
    expect(slugifyThemeId('  Ocean!!  Blue  ')).toBe('ocean-blue')
  })
  it('empty / symbol-only → empty string', () => {
    expect(slugifyThemeId('   ')).toBe('')
    expect(slugifyThemeId('!!!')).toBe('')
  })
})

describe('buildThemeCss', () => {
  it('produces the same output as themeTokensToCss', () => {
    const light = { primary: 'oklch(0.6 0.2 250)' }
    const dark = { primary: 'oklch(0.7 0.2 250)' }
    expect(buildThemeCss('ocean', light, dark)).toBe(
      themeTokensToCss('ocean', light, dark),
    )
  })
})
