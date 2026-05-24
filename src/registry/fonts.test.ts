import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetFontTokensForTest,
  getFontToken,
  listFontTokens,
  registerFontToken,
  unregisterFontToken,
} from './fonts'

// Each test starts from a clean slate. The module's built-in seeding (sans,
// heading, mono) ran once at import time — we wipe so the tests don't depend
// on that ordering.
beforeEach(() => {
  // Stub document so the registry's <style> injection doesn't try to touch
  // a real DOM (vitest runs in node).
  const styleEl = {
    textContent: '',
    setAttribute: vi.fn(),
  } as unknown as HTMLStyleElement
  vi.stubGlobal('document', {
    createElement: vi.fn(() => styleEl),
    head: { appendChild: vi.fn() },
  })
  _resetFontTokensForTest()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('registerFontToken / getFontToken', () => {
  it('stores by id; retrieves by id', () => {
    registerFontToken({ id: 'inter', name: 'Inter', family: '"Inter", sans-serif' })
    expect(getFontToken('inter')?.id).toBe('inter')
    expect(getFontToken('inter')?.name).toBe('Inter')
  })

  it('rejects ids with invalid characters', () => {
    expect(() =>
      registerFontToken({ id: 'Inter Sans', name: 'X', family: 'Y' }),
    ).toThrow(/invalid font token id/)
    expect(() =>
      registerFontToken({ id: 'inter!', name: 'X', family: 'Y' }),
    ).toThrow(/invalid font token id/)
    expect(() => registerFontToken({ id: '', name: 'X', family: 'Y' })).toThrow(
      /invalid font token id/,
    )
  })

  it('accepts lowercase + digits + hyphens', () => {
    expect(() =>
      registerFontToken({ id: 'inter-2024', name: 'Inter 2024', family: 'X' }),
    ).not.toThrow()
  })

  it('re-registering an id overwrites', () => {
    registerFontToken({ id: 'inter', name: 'First', family: 'X' })
    registerFontToken({ id: 'inter', name: 'Second', family: 'Y' })
    expect(getFontToken('inter')?.name).toBe('Second')
    expect(getFontToken('inter')?.family).toBe('Y')
  })
})

describe('listFontTokens', () => {
  it('returns every registered token in insertion order', () => {
    registerFontToken({ id: 'a', name: 'A', family: 'X' })
    registerFontToken({ id: 'b', name: 'B', family: 'Y' })
    registerFontToken({ id: 'c', name: 'C', family: 'Z' })
    expect(listFontTokens().map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })

  it('omits unregistered tokens', () => {
    registerFontToken({ id: 'a', name: 'A', family: 'X' })
    registerFontToken({ id: 'b', name: 'B', family: 'Y' })
    unregisterFontToken('a')
    expect(listFontTokens().map((t) => t.id)).toEqual(['b'])
  })
})

describe('unregisterFontToken', () => {
  it('returns true on successful removal', () => {
    registerFontToken({ id: 'inter', name: 'Inter', family: 'X' })
    expect(unregisterFontToken('inter')).toBe(true)
    expect(getFontToken('inter')).toBeUndefined()
  })

  it('returns false when nothing was removed', () => {
    expect(unregisterFontToken('never-registered')).toBe(false)
  })
})
