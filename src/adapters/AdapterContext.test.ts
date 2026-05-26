import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAdapterRegistryVersion,
  listAdapters,
  registerAdapter,
  subscribeAdapterRegistry,
  unregisterAdapter,
} from './AdapterContext'
import type { Adapter } from './types'

function fixture(id: string): Adapter {
  return {
    id,
    displayName: `Adapter ${id}`,
    components: {},
  }
}

// The adapter registry is module-scoped. Snapshot the baseline state set by
// the editor's side-effect imports (shadcn / mui / chakra-example), so each
// test can leave it clean.
const baselineIds = listAdapters().map((a) => a.id)
const baselineVersion = getAdapterRegistryVersion()

beforeEach(() => {
  for (const a of listAdapters()) {
    if (!baselineIds.includes(a.id)) {
      unregisterAdapter(a.id)
    }
  }
})

describe('adapter registry — subscription (Phase 10 § 2.8)', () => {
  it('bumps the version on register', () => {
    const before = getAdapterRegistryVersion()
    registerAdapter(fixture('sub-a'))
    expect(getAdapterRegistryVersion()).toBe(before + 1)
  })

  it('bumps the version on unregister', () => {
    registerAdapter(fixture('sub-b'))
    const before = getAdapterRegistryVersion()
    unregisterAdapter('sub-b')
    expect(getAdapterRegistryVersion()).toBe(before + 1)
  })

  it('does NOT bump on a no-op unregister', () => {
    const before = getAdapterRegistryVersion()
    expect(unregisterAdapter('nonexistent')).toBe(false)
    expect(getAdapterRegistryVersion()).toBe(before)
  })

  it('fires subscribers on register + unregister', () => {
    const listener = vi.fn()
    const unsub = subscribeAdapterRegistry(listener)
    registerAdapter(fixture('sub-c'))
    expect(listener).toHaveBeenCalledTimes(1)
    unregisterAdapter('sub-c')
    expect(listener).toHaveBeenCalledTimes(2)
    unsub()
  })

  it('stops firing after unsubscribe', () => {
    const listener = vi.fn()
    const unsub = subscribeAdapterRegistry(listener)
    unsub()
    registerAdapter(fixture('sub-d'))
    expect(listener).not.toHaveBeenCalled()
  })

  it('listAdapters reflects the bumped state', () => {
    registerAdapter(fixture('list-a'))
    expect(listAdapters().some((a) => a.id === 'list-a')).toBe(true)
    unregisterAdapter('list-a')
    expect(listAdapters().some((a) => a.id === 'list-a')).toBe(false)
  })

  it('version is monotonic across the suite', () => {
    expect(getAdapterRegistryVersion()).toBeGreaterThanOrEqual(baselineVersion)
  })
})
