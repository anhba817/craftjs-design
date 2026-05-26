import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
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
