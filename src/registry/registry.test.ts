import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  __setEditorMountedForTest,
  getComponent,
  getRegistryVersion,
  listComponents,
  registerCanonical,
  registerComponent,
  subscribeRegistry,
  unregisterCanonical,
} from './registry'

// All tests share the same module-level registry. We use unique ids per test
// to avoid leakage. The editor-mounted flag is reset in afterEach so tests
// that flip it don't bleed into others.

function makeDef(id: string) {
  return {
    id,
    category: 'layout' as const,
    displayName: `Test_${id}`,
    tags: [] as readonly string[],
    isCanvas: false,
    styleSlots: ['root'] as const,
    propsSchema: z.object({}),
    defaults: { props: {}, style: { classes: { root: '' } } },
  }
}

afterEach(() => {
  __setEditorMountedForTest(false)
})

describe('registry — Phase 6 lifecycle API', () => {
  it('registerCanonical is an alias for registerComponent', () => {
    expect(registerCanonical).toBe(registerComponent)
  })

  it('registerCanonical stores the definition', () => {
    const id = 'phase6-rc-store'
    registerCanonical(makeDef(id))
    expect(getComponent(id)?.id).toBe(id)
  })

  it('registerCanonical throws on duplicate ids', () => {
    const id = 'phase6-rc-dup'
    registerCanonical(makeDef(id))
    expect(() => registerCanonical(makeDef(id))).toThrow(/duplicate/)
  })

  it('unregisterCanonical removes the definition', () => {
    const id = 'phase6-rc-remove'
    registerCanonical(makeDef(id))
    expect(getComponent(id)).toBeDefined()
    expect(unregisterCanonical(id)).toBe(true)
    expect(getComponent(id)).toBeUndefined()
  })

  it('unregisterCanonical returns false when nothing was removed', () => {
    expect(unregisterCanonical('phase6-never-registered')).toBe(false)
  })

  it('unregister then re-register works', () => {
    const id = 'phase6-rc-rereg'
    registerCanonical(makeDef(id))
    unregisterCanonical(id)
    expect(() => registerCanonical(makeDef(id))).not.toThrow()
    expect(getComponent(id)?.id).toBe(id)
  })

  describe('Phase 7 — registry version + hot reload subscription', () => {
    it('getRegistryVersion is monotonic', () => {
      const v0 = getRegistryVersion()
      __setEditorMountedForTest(true)
      registerCanonical(makeDef('phase7-version-a'))
      const v1 = getRegistryVersion()
      registerCanonical(makeDef('phase7-version-b'))
      const v2 = getRegistryVersion()
      expect(v1).toBeGreaterThan(v0)
      expect(v2).toBeGreaterThan(v1)
    })

    it('pre-mount registrations do NOT bump the version', () => {
      const before = getRegistryVersion()
      registerCanonical(makeDef('phase7-version-premount'))
      expect(getRegistryVersion()).toBe(before)
    })

    it('post-mount unregister bumps the version', () => {
      __setEditorMountedForTest(true)
      registerCanonical(makeDef('phase7-version-unreg'))
      const before = getRegistryVersion()
      expect(unregisterCanonical('phase7-version-unreg')).toBe(true)
      expect(getRegistryVersion()).toBeGreaterThan(before)
    })

    it('subscribers fire on registry-version bumps', () => {
      let calls = 0
      const unsubscribe = subscribeRegistry(() => {
        calls += 1
      })
      __setEditorMountedForTest(true)
      registerCanonical(makeDef('phase7-version-sub'))
      expect(calls).toBe(1)
      unregisterCanonical('phase7-version-sub')
      expect(calls).toBe(2)
      unsubscribe()
      // After unsubscribe, no more calls.
      registerCanonical(makeDef('phase7-version-sub-2'))
      expect(calls).toBe(2)
    })
  })

  it('listComponents returns every registered canonical', () => {
    const before = listComponents().length
    registerCanonical(makeDef('phase6-rc-list-a'))
    registerCanonical(makeDef('phase6-rc-list-b'))
    expect(listComponents().length).toBe(before + 2)
  })
})
