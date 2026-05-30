import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetFontTokensForTest,
  getFontRegistryVersion,
  getFontToken,
  isSafeFontFamily,
  isSafeFontUrl,
  listFontTokens,
  registerFontToken,
  subscribeFontRegistry,
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

// Phase 15 § 11.2 — CSS-injection hardening for the font surface.
describe('font value validation', () => {
  it('accepts legitimate font URLs (incl. the Google Fonts CSS API + data:)', () => {
    expect(isSafeFontUrl('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap')).toBe(true)
    expect(isSafeFontUrl('/fonts/inter.woff2')).toBe(true)
    expect(isSafeFontUrl('data:font/woff2;base64,AAAA')).toBe(true)
  })

  it('rejects URLs that break out of url("…") or use unsafe schemes', () => {
    expect(isSafeFontUrl('x") } body { display: none } @font-face { src: url("y')).toBe(false) // quotes/parens
    expect(isSafeFontUrl('javascript:alert(1)')).toBe(false) // scheme
    expect(isSafeFontUrl('https://x/\n@import "evil"')).toBe(false) // control char
    expect(isSafeFontUrl('https://x/<script>')).toBe(false) // angle brackets
  })

  it('accepts legitimate font families (stacks, quotes, var(), hyphens, spaces)', () => {
    expect(isSafeFontFamily('"Inter Variable", sans-serif')).toBe(true)
    expect(isSafeFontFamily('var(--font-sans)')).toBe(true)
    expect(isSafeFontFamily('ui-monospace, SFMono-Regular, "Roboto Mono", monospace')).toBe(true)
  })

  it('rejects families that break out of the font-family rule', () => {
    expect(isSafeFontFamily('x } body { display: none }')).toBe(false) // braces
    expect(isSafeFontFamily('sans-serif; } .evil {')).toBe(false) // semicolon + brace
    expect(isSafeFontFamily('</style><script>')).toBe(false) // tag breakout
  })

  it('registerFontToken throws on an unsafe url or family', () => {
    expect(() =>
      registerFontToken({ id: 'evil1', name: 'E', family: 'sans-serif', url: 'x") } .e {' }),
    ).toThrow(/unsafe font url/)
    expect(() =>
      registerFontToken({ id: 'evil2', name: 'E', family: 'x } .e {' }),
    ).toThrow(/unsafe font family/)
  })
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

describe('font registry — subscription (Phase 10 § 2.7)', () => {
  it('bumps the version on register', () => {
    const before = getFontRegistryVersion()
    registerFontToken({ id: 'sub-a', name: 'A', family: 'X' })
    expect(getFontRegistryVersion()).toBe(before + 1)
  })

  it('bumps the version on unregister', () => {
    registerFontToken({ id: 'sub-b', name: 'B', family: 'X' })
    const before = getFontRegistryVersion()
    unregisterFontToken('sub-b')
    expect(getFontRegistryVersion()).toBe(before + 1)
  })

  it('does NOT bump on a no-op unregister', () => {
    const before = getFontRegistryVersion()
    expect(unregisterFontToken('nonexistent')).toBe(false)
    expect(getFontRegistryVersion()).toBe(before)
  })

  it('fires subscribers on register + unregister', () => {
    const listener = vi.fn()
    const unsub = subscribeFontRegistry(listener)
    registerFontToken({ id: 'sub-c', name: 'C', family: 'X' })
    expect(listener).toHaveBeenCalledTimes(1)
    unregisterFontToken('sub-c')
    expect(listener).toHaveBeenCalledTimes(2)
    unsub()
  })

  it('stops firing after unsubscribe', () => {
    const listener = vi.fn()
    const unsub = subscribeFontRegistry(listener)
    unsub()
    registerFontToken({ id: 'sub-d', name: 'D', family: 'X' })
    expect(listener).not.toHaveBeenCalled()
  })
})

// Verify listFontTokens reflects each bump so useSyncExternalStore consumers
// see the right list.
describe('font registry — listFontTokens reactivity (Phase 10 § 2.7)', () => {
  it('returns the new token after register', () => {
    registerFontToken({ id: 'react-a', name: 'A', family: 'X' })
    expect(listFontTokens().some((t) => t.id === 'react-a')).toBe(true)
  })

  it('omits a removed token after unregister', () => {
    registerFontToken({ id: 'react-b', name: 'B', family: 'X' })
    unregisterFontToken('react-b')
    expect(listFontTokens().some((t) => t.id === 'react-b')).toBe(false)
  })
})
