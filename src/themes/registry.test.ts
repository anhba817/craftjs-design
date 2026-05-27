import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getTheme,
  getThemeRegistryVersion,
  listThemes,
  registerTheme,
  subscribeThemeRegistry,
  unregisterTheme,
} from './registry'

const baseline = listThemes()
const baselineVersion = getThemeRegistryVersion()

// Each test snapshots the current registry state so it can restore after
// — themes are module-scoped and shared with sibling tests / the rest of
// the editor that imports them at boot.
beforeEach(() => {
  // Remove anything added after the baseline.
  const current = listThemes()
  for (const t of current) {
    if (!baseline.some((b) => b.id === t.id)) {
      unregisterTheme(t.id)
    }
  }
})

describe('themes registry — subscription (Phase 10 § 2.9)', () => {
  it('bumps the version counter on register', () => {
    const before = getThemeRegistryVersion()
    registerTheme({ id: 'test-bump-1', displayName: 'T1', dataThemeValue: 't1' })
    expect(getThemeRegistryVersion()).toBe(before + 1)
  })

  it('bumps the version counter on unregister', () => {
    registerTheme({ id: 'test-bump-2', displayName: 'T2', dataThemeValue: 't2' })
    const before = getThemeRegistryVersion()
    unregisterTheme('test-bump-2')
    expect(getThemeRegistryVersion()).toBe(before + 1)
  })

  it('does NOT bump if unregister is a miss', () => {
    const before = getThemeRegistryVersion()
    expect(unregisterTheme('nonexistent')).toBe(false)
    expect(getThemeRegistryVersion()).toBe(before)
  })

  it('fires subscribers on register + unregister', () => {
    const listener = vi.fn()
    const unsub = subscribeThemeRegistry(listener)
    registerTheme({ id: 'test-sub-1', displayName: 'S1', dataThemeValue: 's1' })
    expect(listener).toHaveBeenCalledTimes(1)
    unregisterTheme('test-sub-1')
    expect(listener).toHaveBeenCalledTimes(2)
    unsub()
  })

  it('stops firing after unsubscribe', () => {
    const listener = vi.fn()
    const unsub = subscribeThemeRegistry(listener)
    unsub()
    registerTheme({ id: 'test-sub-2', displayName: 'S2', dataThemeValue: 's2' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('listThemes reflects the bumped state', () => {
    registerTheme({ id: 'test-list', displayName: 'L', dataThemeValue: 'l' })
    expect(listThemes().some((t) => t.id === 'test-list')).toBe(true)
    unregisterTheme('test-list')
    expect(listThemes().some((t) => t.id === 'test-list')).toBe(false)
  })

  it('version is monotonic across the suite', () => {
    expect(getThemeRegistryVersion()).toBeGreaterThanOrEqual(baselineVersion)
  })
})

// Phase 12 § 4.11 — token-driven theme CSS injection. Stub `document` so
// the registry's <style> writer captures CSS without a real DOM (vitest
// runs in node, same approach as fonts.test.ts).
describe('themes registry — token CSS injection (Phase 12 § 4.11)', () => {
  const styleEl = { textContent: '', setAttribute: vi.fn() } as unknown as {
    textContent: string
    setAttribute: () => void
  }

  beforeEach(() => {
    styleEl.textContent = ''
    vi.stubGlobal('document', {
      createElement: vi.fn(() => styleEl),
      head: { appendChild: vi.fn() },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('injects a [data-theme] block for a token theme', () => {
    registerTheme({
      id: 'test-tok',
      displayName: 'Tok',
      tokens: { primary: 'oklch(0.6 0.2 250)' },
    })
    expect(styleEl.textContent).toContain('[data-theme="test-tok"]')
    expect(styleEl.textContent).toContain('--primary: oklch(0.6 0.2 250);')
    unregisterTheme('test-tok')
  })

  it('defaults dataThemeValue to the id for token themes', () => {
    registerTheme({
      id: 'test-tok-id',
      displayName: 'TokId',
      tokens: { primary: 'oklch(0.6 0.2 250)' },
    })
    expect(getTheme('test-tok-id')?.dataThemeValue).toBe('test-tok-id')
    unregisterTheme('test-tok-id')
  })

  it('rebuilds the sheet on unregister (block removed)', () => {
    registerTheme({
      id: 'test-tok-rm',
      displayName: 'Rm',
      tokens: { primary: 'oklch(0.6 0.2 250)' },
    })
    expect(styleEl.textContent).toContain('[data-theme="test-tok-rm"]')
    unregisterTheme('test-tok-rm')
    expect(styleEl.textContent).not.toContain('[data-theme="test-tok-rm"]')
  })

  it('CSS-only themes (no tokens) contribute nothing', () => {
    registerTheme({
      id: 'test-css-only',
      displayName: 'CSSOnly',
      dataThemeValue: 'css-only',
    })
    expect(styleEl.textContent).not.toContain('[data-theme="css-only"]')
    unregisterTheme('test-css-only')
  })
})
