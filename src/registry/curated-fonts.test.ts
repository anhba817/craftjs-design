import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GOOGLE_FONTS,
  SYSTEM_FONTS,
  googleFontsHref,
  registerSystemFonts,
} from './curated-fonts'
import { _resetFontTokensForTest, getFontToken } from './fonts'

const ID_RE = /^[a-z0-9-]+$/

describe('curated font lists', () => {
  it('all ids are valid font-token ids', () => {
    for (const f of [...SYSTEM_FONTS, ...GOOGLE_FONTS]) {
      expect(f.id, f.id).toMatch(ID_RE)
    }
  })
  it('ids are unique across both lists', () => {
    const ids = [...SYSTEM_FONTS, ...GOOGLE_FONTS].map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('non-empty', () => {
    expect(SYSTEM_FONTS.length).toBeGreaterThan(0)
    expect(GOOGLE_FONTS.length).toBeGreaterThan(0)
  })
})

describe('googleFontsHref', () => {
  it('builds one combined css2 URL with every family + display=swap', () => {
    const href = googleFontsHref()
    expect(href.startsWith('https://fonts.googleapis.com/css2?')).toBe(true)
    expect(href).toContain('family=Inter:wght@300;400;500;600;700')
    expect(href).toContain('family=Open+Sans:wght@300;400;600;700')
    expect(href).toContain('display=swap')
    // one request for all curated families
    expect(href.split('family=').length - 1).toBe(GOOGLE_FONTS.length)
  })
})

describe('registerSystemFonts', () => {
  beforeEach(() => {
    vi.stubGlobal('document', undefined)
    _resetFontTokensForTest()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    _resetFontTokensForTest()
  })

  it('registers every system font token', () => {
    registerSystemFonts()
    for (const f of SYSTEM_FONTS) {
      expect(getFontToken(f.id)?.family).toBe(f.family)
    }
  })
})
