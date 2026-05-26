import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  _clearTemplatesForTest,
  getTemplate,
  getTemplateRegistryVersion,
  listTemplates,
  registerTemplate,
  subscribeTemplateRegistry,
  unregisterTemplate,
} from './registry'

function makeTemplate(id: string) {
  return {
    id,
    name: `Template ${id}`,
    description: 'desc',
    envelope: {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: '{}',
    },
  }
}

afterEach(() => {
  _clearTemplatesForTest()
})

describe('template registry', () => {
  it('registerTemplate stores by id; getTemplate retrieves', () => {
    registerTemplate(makeTemplate('t1'))
    expect(getTemplate('t1')?.id).toBe('t1')
  })

  it('listTemplates returns every registered template', () => {
    registerTemplate(makeTemplate('a'))
    registerTemplate(makeTemplate('b'))
    expect(listTemplates().map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('registerTemplate throws on duplicate ids', () => {
    registerTemplate(makeTemplate('dup'))
    expect(() => registerTemplate(makeTemplate('dup'))).toThrow(/duplicate/)
  })

  it('getTemplate returns undefined for unknown ids', () => {
    expect(getTemplate('missing')).toBeUndefined()
  })
})

describe('template registry — subscription (Phase 10 § 2.10)', () => {
  it('bumps the version on register', () => {
    const before = getTemplateRegistryVersion()
    registerTemplate(makeTemplate('sv1'))
    expect(getTemplateRegistryVersion()).toBe(before + 1)
  })

  it('bumps the version on unregister', () => {
    registerTemplate(makeTemplate('sv2'))
    const before = getTemplateRegistryVersion()
    unregisterTemplate('sv2')
    expect(getTemplateRegistryVersion()).toBe(before + 1)
  })

  it('does NOT bump on a no-op unregister', () => {
    const before = getTemplateRegistryVersion()
    expect(unregisterTemplate('nonexistent')).toBe(false)
    expect(getTemplateRegistryVersion()).toBe(before)
  })

  it('fires subscribers on register + unregister', () => {
    const listener = vi.fn()
    const unsub = subscribeTemplateRegistry(listener)
    registerTemplate(makeTemplate('sub1'))
    expect(listener).toHaveBeenCalledTimes(1)
    unregisterTemplate('sub1')
    expect(listener).toHaveBeenCalledTimes(2)
    unsub()
  })

  it('stops firing after unsubscribe', () => {
    const listener = vi.fn()
    const unsub = subscribeTemplateRegistry(listener)
    unsub()
    registerTemplate(makeTemplate('sub2'))
    expect(listener).not.toHaveBeenCalled()
  })
})
