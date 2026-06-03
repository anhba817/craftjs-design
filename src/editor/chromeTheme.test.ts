import { describe, expect, it } from 'vitest'
import { resolveChromeTheme } from './chromeTheme'

// Phase 19 Group C — pure mapping from the `editorTheme` prop to the
// data-editor-theme preset + inline --ed-* variables the Editor applies.

describe('resolveChromeTheme', () => {
  it('defaults to the light preset with no overrides', () => {
    expect(resolveChromeTheme(undefined)).toEqual({
      preset: 'light',
      vars: {},
    })
  })

  it('passes preset names through with no overrides', () => {
    expect(resolveChromeTheme('light')).toEqual({ preset: 'light', vars: {} })
    expect(resolveChromeTheme('dark')).toEqual({ preset: 'dark', vars: {} })
  })

  it('maps token keys to --ed-* variables', () => {
    expect(
      resolveChromeTheme({
        surface: '#16161e',
        surface2: '#1a1b26',
        surface3: '#24283b',
        border: '#2f3549',
        border2: '#3b4261',
        borderStrong: '#565f89',
        textStrong: '#c0caf5',
        text: '#a9b1d6',
        textMuted: '#787c99',
        textFaint: '#565f89',
        accent: '#7aa2f7',
        accentFg: '#16161e',
        danger: '#f7768e',
        dangerFg: '#16161e',
      }),
    ).toEqual({
      preset: 'light',
      vars: {
        '--ed-surface': '#16161e',
        '--ed-surface-2': '#1a1b26',
        '--ed-surface-3': '#24283b',
        '--ed-border': '#2f3549',
        '--ed-border-2': '#3b4261',
        '--ed-border-strong': '#565f89',
        '--ed-text-strong': '#c0caf5',
        '--ed-text': '#a9b1d6',
        '--ed-text-muted': '#787c99',
        '--ed-text-faint': '#565f89',
        '--ed-accent': '#7aa2f7',
        '--ed-accent-fg': '#16161e',
        '--ed-danger': '#f7768e',
        '--ed-danger-fg': '#16161e',
      },
    })
  })

  it('omits unset tokens so the preset CSS shows through', () => {
    expect(resolveChromeTheme({ accent: 'rebeccapurple' })).toEqual({
      preset: 'light',
      vars: { '--ed-accent': 'rebeccapurple' },
    })
  })

  it('lets a token map extend the dark preset', () => {
    expect(resolveChromeTheme({ preset: 'dark', accent: '#7aa2f7' })).toEqual({
      preset: 'dark',
      vars: { '--ed-accent': '#7aa2f7' },
    })
  })

  it('does not emit a variable for the preset key itself', () => {
    const { vars } = resolveChromeTheme({ preset: 'dark' })
    expect(vars).toEqual({})
  })
})
