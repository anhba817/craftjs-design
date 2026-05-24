import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  __setEditorMountedForTest,
  getComponent,
  listComponents,
  registerCanonical,
  registerComponent,
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

  describe('post-mount warning', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      warnSpy.mockRestore()
    })

    it('does not warn during pre-mount registration', () => {
      registerCanonical(makeDef('phase6-rc-premount'))
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('warns when registering after the editor mounts', () => {
      __setEditorMountedForTest(true)
      registerCanonical(makeDef('phase6-rc-postmount'))
      expect(warnSpy).toHaveBeenCalled()
      const msg = String(warnSpy.mock.calls[0]?.[0] ?? '')
      expect(msg).toMatch(/after editor mount/)
    })
  })

  it('listComponents returns every registered canonical', () => {
    const before = listComponents().length
    registerCanonical(makeDef('phase6-rc-list-a'))
    registerCanonical(makeDef('phase6-rc-list-b'))
    expect(listComponents().length).toBe(before + 2)
  })
})
