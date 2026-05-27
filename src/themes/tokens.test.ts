import { describe, expect, it } from 'vitest'
import {
  contrastForeground,
  deriveTokens,
  oklchLightness,
  themeTokensToCss,
} from './tokens'

describe('oklchLightness', () => {
  it('reads L from oklch(L C H)', () => {
    expect(oklchLightness('oklch(0.205 0 0)')).toBeCloseTo(0.205)
    expect(oklchLightness('oklch(0.723 0.219 149.579)')).toBeCloseTo(0.723)
  })
  it('handles percentage lightness', () => {
    expect(oklchLightness('oklch(70% 0.1 200)')).toBeCloseTo(0.7)
  })
  it('returns null for non-oklch colors', () => {
    expect(oklchLightness('#ff0000')).toBeNull()
    expect(oklchLightness('rgb(0,0,0)')).toBeNull()
  })
})

describe('contrastForeground', () => {
  it('dark text on a light background', () => {
    expect(contrastForeground('oklch(0.97 0 0)')).toBe('oklch(0.145 0 0)')
  })
  it('light text on a dark background', () => {
    expect(contrastForeground('oklch(0.205 0 0)')).toBe('oklch(0.985 0 0)')
  })
  it('defaults to light text for unparseable colors', () => {
    expect(contrastForeground('#123456')).toBe('oklch(0.985 0 0)')
  })
})

describe('deriveTokens', () => {
  it('fills the full core set from just primary', () => {
    const t = deriveTokens({ primary: 'oklch(0.5 0.2 250)' })
    // every core token present
    for (const key of [
      'background',
      'foreground',
      'card',
      'card-foreground',
      'popover',
      'popover-foreground',
      'primary',
      'primary-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'destructive',
      'border',
      'input',
      'ring',
      'sidebar-primary',
      'sidebar-primary-foreground',
      'sidebar-ring',
    ]) {
      expect(t[key], `missing token: ${key}`).toBeTruthy()
    }
  })

  it('derives related tokens (card=background, input=border, ring=primary)', () => {
    const t = deriveTokens({
      primary: 'oklch(0.5 0.2 250)',
      background: 'oklch(0.99 0 0)',
      border: 'oklch(0.9 0 0)',
    })
    expect(t.card).toBe('oklch(0.99 0 0)')
    expect(t.popover).toBe('oklch(0.99 0 0)')
    expect(t.input).toBe('oklch(0.9 0 0)')
    expect(t.ring).toBe('oklch(0.5 0.2 250)')
  })

  it('keeps sidebar brand accents in step with primary', () => {
    const t = deriveTokens({
      primary: 'oklch(0.5 0.2 250)',
      primaryForeground: 'oklch(0.98 0 0)',
    })
    expect(t['sidebar-primary']).toBe('oklch(0.5 0.2 250)')
    expect(t['sidebar-primary-foreground']).toBe('oklch(0.98 0 0)')
    expect(t['sidebar-ring']).toBe(t.ring)
  })

  it('respects explicit overrides over derivation', () => {
    const t = deriveTokens({
      primary: 'oklch(0.205 0 0)', // dark → heuristic would pick light fg
      primaryForeground: 'oklch(0.5 0 0)', // but we override
      ring: 'oklch(0.7 0 0)',
    })
    expect(t['primary-foreground']).toBe('oklch(0.5 0 0)')
    expect(t.ring).toBe('oklch(0.7 0 0)')
  })

  it('emits --radius only when provided', () => {
    expect(deriveTokens({ primary: 'oklch(0.5 0 0)' }).radius).toBeUndefined()
    expect(
      deriveTokens({ primary: 'oklch(0.5 0 0)', radius: '0.5rem' }).radius,
    ).toBe('0.5rem')
  })

  it('is pure — same input yields equal output', () => {
    const input = { primary: 'oklch(0.5 0.2 250)' }
    expect(deriveTokens(input)).toEqual(deriveTokens(input))
  })
})

describe('themeTokensToCss', () => {
  it('wraps declarations in a [data-theme] selector', () => {
    const css = themeTokensToCss('blue', { primary: 'oklch(0.6 0.2 250)' })
    expect(css.startsWith('[data-theme="blue"] {')).toBe(true)
    expect(css.trimEnd().endsWith('}')).toBe(true)
    expect(css).toContain('--primary: oklch(0.6 0.2 250);')
    expect(css).toContain('--primary-foreground:')
  })
})
