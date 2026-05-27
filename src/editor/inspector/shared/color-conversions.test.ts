import { describe, expect, it } from 'vitest'
import {
  formatOklch,
  hexToHsl,
  hexToRgb,
  hslToHex,
  hslToRgb,
  normalizeHex,
  parseOklch,
  rgbToHex,
  rgbToHsl,
} from './color-conversions'

describe('parseOklch / formatOklch', () => {
  it('parses oklch(L C H)', () => {
    expect(parseOklch('oklch(0.55 0.2 255)')).toEqual({
      l: 0.55,
      c: 0.2,
      h: 255,
    })
  })
  it('parses percentage lightness', () => {
    expect(parseOklch('oklch(70% 0.1 200)')?.l).toBeCloseTo(0.7)
  })
  it('returns null for non-oklch / empty', () => {
    expect(parseOklch('#abcdef')).toBeNull()
    expect(parseOklch('')).toBeNull()
    expect(parseOklch('var(--primary)')).toBeNull()
  })
  it('formats with bounded precision', () => {
    expect(formatOklch({ l: 0.5, c: 0.1, h: 250 })).toBe('oklch(0.5 0.1 250)')
  })
  it('round-trips through format → parse', () => {
    const o = { l: 0.612, c: 0.214, h: 29.23 }
    expect(parseOklch(formatOklch(o))).toEqual(o)
  })
})

describe('normalizeHex', () => {
  it('accepts 6-char hex with leading #', () => {
    expect(normalizeHex('#ff0000')).toBe('#ff0000')
  })

  it('accepts 6-char hex without #', () => {
    expect(normalizeHex('ff0000')).toBe('#ff0000')
  })

  it('expands 3-char shorthand', () => {
    expect(normalizeHex('#f00')).toBe('#ff0000')
    expect(normalizeHex('abc')).toBe('#aabbcc')
  })

  it('lowercases uppercase input', () => {
    expect(normalizeHex('#FF00AA')).toBe('#ff00aa')
  })

  it('returns null for garbage', () => {
    expect(normalizeHex('hello')).toBeNull()
    expect(normalizeHex('#zzz')).toBeNull()
    expect(normalizeHex('#ff00')).toBeNull()
    expect(normalizeHex('')).toBeNull()
  })

  it('trims whitespace', () => {
    expect(normalizeHex('  #ff0000  ')).toBe('#ff0000')
  })
})

describe('hexToRgb / rgbToHex', () => {
  it('round-trips primary colors', () => {
    expect(rgbToHex(hexToRgb('#ff0000'))).toBe('#ff0000')
    expect(rgbToHex(hexToRgb('#00ff00'))).toBe('#00ff00')
    expect(rgbToHex(hexToRgb('#0000ff'))).toBe('#0000ff')
  })

  it('handles black and white', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff')
  })

  it('parses mid-range colors', () => {
    expect(hexToRgb('#808080')).toEqual({ r: 128, g: 128, b: 128 })
  })

  it('rgbToHex clamps and rounds out-of-range inputs', () => {
    expect(rgbToHex({ r: -10, g: 300, b: 127.6 })).toBe('#00ff80')
  })

  it('hexToRgb returns black on garbage', () => {
    expect(hexToRgb('not a color')).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe('rgbToHsl / hslToRgb', () => {
  it('round-trips primary colors', () => {
    const red = { r: 255, g: 0, b: 0 }
    expect(rgbToHsl(red)).toEqual({ h: 0, s: 100, l: 50 })
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual(red)

    const green = { r: 0, g: 255, b: 0 }
    expect(rgbToHsl(green)).toEqual({ h: 120, s: 100, l: 50 })
    expect(hslToRgb({ h: 120, s: 100, l: 50 })).toEqual(green)

    const blue = { r: 0, g: 0, b: 255 }
    expect(rgbToHsl(blue)).toEqual({ h: 240, s: 100, l: 50 })
    expect(hslToRgb({ h: 240, s: 100, l: 50 })).toEqual(blue)
  })

  it('rgbToHsl returns hue=0 for grayscale', () => {
    expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 })
    expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50 })
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 })
  })

  it('hslToRgb wraps hue beyond 360 and clamps s/l', () => {
    // h=420 wraps to 60 (yellow); s=100, l=50 → pure yellow
    expect(hslToRgb({ h: 420, s: 100, l: 50 })).toEqual({ r: 255, g: 255, b: 0 })
    // s and l out of range get clamped before computation
    expect(hslToRgb({ h: 0, s: 150, l: -10 })).toEqual({ r: 0, g: 0, b: 0 })
    expect(hslToRgb({ h: 0, s: 0, l: 150 })).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('hslToRgb handles negative hue (wraps positive)', () => {
    // -60 == 300 (magenta)
    expect(hslToRgb({ h: -60, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 255 })
  })
})

describe('hexToHsl / hslToHex', () => {
  it('round-trips primary colors', () => {
    expect(hslToHex(hexToHsl('#ff0000'))).toBe('#ff0000')
    expect(hslToHex(hexToHsl('#00ff00'))).toBe('#00ff00')
    expect(hslToHex(hexToHsl('#0000ff'))).toBe('#0000ff')
  })

  it('round-trips a darker color within 1 step (rounding tolerance)', () => {
    // HSL ↔ RGB conversions accumulate rounding. ±1 per channel is the floor.
    const original = '#3a7fbc'
    const rountripped = hslToHex(hexToHsl(original))
    const orig = hexToRgb(original)
    const rt = hexToRgb(rountripped)
    expect(Math.abs(orig.r - rt.r)).toBeLessThanOrEqual(1)
    expect(Math.abs(orig.g - rt.g)).toBeLessThanOrEqual(1)
    expect(Math.abs(orig.b - rt.b)).toBeLessThanOrEqual(1)
  })
})
