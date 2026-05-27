import { describe, expect, it } from 'vitest'
import {
  colorValueFromState,
  cssFromColorValue,
} from './ColorPicker'
import {
  contrastGrade,
  contrastRatio,
  oklchToRgb,
  relativeLuminance,
} from './contrast'

const WHITE = { r: 255, g: 255, b: 255 }
const BLACK = { r: 0, g: 0, b: 0 }

describe('relativeLuminance', () => {
  it('white = 1, black = 0', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1)
    expect(relativeLuminance(BLACK)).toBeCloseTo(0)
  })
})

describe('contrastRatio', () => {
  it('black on white = 21:1', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 1)
  })
  it('identical colors = 1:1', () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1)
  })
  it('is order-independent', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(contrastRatio(WHITE, BLACK))
  })
  it('matches a known mid-gray pair', () => {
    // #767676 on white is the canonical AA boundary (~4.54:1).
    const gray = { r: 0x76, g: 0x76, b: 0x76 }
    expect(contrastRatio(gray, WHITE)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(gray, WHITE)).toBeLessThan(4.6)
  })
})

describe('contrastGrade', () => {
  it('normal-text thresholds', () => {
    expect(contrastGrade(21)).toBe('AAA')
    expect(contrastGrade(7)).toBe('AAA')
    expect(contrastGrade(4.5)).toBe('AA')
    expect(contrastGrade(3)).toBe('AA Large')
    expect(contrastGrade(2.9)).toBe('Fail')
  })
  it('large-text thresholds', () => {
    expect(contrastGrade(4.5, true)).toBe('AAA')
    expect(contrastGrade(3, true)).toBe('AA')
    expect(contrastGrade(2.9, true)).toBe('Fail')
  })
})

describe('oklchToRgb', () => {
  const near = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol
  it('oklch(1 0 0) ≈ white', () => {
    const c = oklchToRgb(1, 0, 0)
    expect(near(c.r, 255) && near(c.g, 255) && near(c.b, 255)).toBe(true)
  })
  it('oklch(0 0 0) ≈ black', () => {
    const c = oklchToRgb(0, 0, 0)
    expect(c).toEqual({ r: 0, g: 0, b: 0 })
  })
  it('achromatic L=0.205 → mid-dark gray (r≈g≈b)', () => {
    const c = oklchToRgb(0.205, 0, 0)
    expect(c.r).toBe(c.g)
    expect(c.g).toBe(c.b)
    expect(c.r).toBeGreaterThan(20)
    expect(c.r).toBeLessThan(70)
  })
  it('clamps out-of-gamut channels to 0..255', () => {
    const c = oklchToRgb(0.7, 0.3, 30) // saturated, may exceed gamut
    for (const ch of [c.r, c.g, c.b]) {
      expect(ch).toBeGreaterThanOrEqual(0)
      expect(ch).toBeLessThanOrEqual(255)
    }
  })
})

describe('colorValueFromState — var detection', () => {
  it('reads a bare var(--name) inline value as a var state', () => {
    expect(colorValueFromState(undefined, 'var(--brand-blue)')).toEqual({
      kind: 'var',
      name: 'brand-blue',
    })
  })
  it('still reads a hex as hex', () => {
    expect(colorValueFromState(undefined, '#abcdef')).toEqual({
      kind: 'hex',
      hex: '#abcdef',
    })
  })
  it('token wins only when no inline value', () => {
    expect(colorValueFromState('primary', undefined)).toEqual({
      kind: 'token',
      token: 'primary',
    })
  })
})

describe('cssFromColorValue', () => {
  it('token → var(--token)', () => {
    expect(cssFromColorValue({ kind: 'token', token: 'primary' })).toBe(
      'var(--primary)',
    )
  })
  it('var → var(--name)', () => {
    expect(cssFromColorValue({ kind: 'var', name: 'brand-blue' })).toBe(
      'var(--brand-blue)',
    )
  })
  it('hex → hex', () => {
    expect(cssFromColorValue({ kind: 'hex', hex: '#fff' })).toBe('#fff')
  })
  it('gradient / unset → null', () => {
    expect(cssFromColorValue({ kind: 'unset' })).toBeNull()
  })
})
