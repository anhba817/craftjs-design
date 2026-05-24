import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CanonicalComponent } from '@/registry/types'
import {
  getPanelsFor,
  listPanels,
  registerPanel,
  unregisterPanel,
} from './panel-registry'

function makeDef(
  overrides: Partial<CanonicalComponent> = {},
): CanonicalComponent {
  return {
    id: 'test-canonical',
    category: 'layout',
    displayName: 'TestCanonical',
    tags: [],
    isCanvas: false,
    styleSlots: ['root'],
    propsSchema: z.object({}),
    defaults: { props: {}, style: { classes: { root: '' } } },
    ...overrides,
  }
}

function Noop() {
  return null
}

const TEST_IDS = ['test-pr-a', 'test-pr-b', 'test-pr-replace', 'test-pr-applicable']
afterEach(() => {
  for (const id of TEST_IDS) unregisterPanel(id)
})

describe('panel-registry', () => {
  it('registered panels appear in listPanels sorted by order', () => {
    registerPanel({
      id: 'test-pr-b',
      displayName: 'B',
      order: 200,
      applicableTo: () => true,
      component: Noop,
    })
    registerPanel({
      id: 'test-pr-a',
      displayName: 'A',
      order: 100,
      applicableTo: () => true,
      component: Noop,
    })

    const ids = listPanels().map((p) => p.id)
    const aIdx = ids.indexOf('test-pr-a')
    const bIdx = ids.indexOf('test-pr-b')
    expect(aIdx).toBeGreaterThan(-1)
    expect(bIdx).toBeGreaterThan(aIdx)
  })

  it('unregisterPanel removes by id', () => {
    registerPanel({
      id: 'test-pr-a',
      displayName: 'A',
      order: 100,
      applicableTo: () => true,
      component: Noop,
    })
    expect(unregisterPanel('test-pr-a')).toBe(true)
    expect(listPanels().find((p) => p.id === 'test-pr-a')).toBeUndefined()
  })

  it('registerPanel with existing id replaces in place', () => {
    registerPanel({
      id: 'test-pr-replace',
      displayName: 'First',
      order: 100,
      applicableTo: () => true,
      component: Noop,
    })
    registerPanel({
      id: 'test-pr-replace',
      displayName: 'Second',
      order: 100,
      applicableTo: () => true,
      component: Noop,
    })
    const entry = listPanels().find((p) => p.id === 'test-pr-replace')
    expect(entry?.displayName).toBe('Second')
  })

  it('getPanelsFor consults applicableTo when applicablePanels is unset', () => {
    registerPanel({
      id: 'test-pr-applicable',
      displayName: 'Apply',
      order: 999,
      applicableTo: (def) => def.category === 'layout',
      component: Noop,
    })
    const layoutDef = makeDef({ category: 'layout' })
    const inputDef = makeDef({ category: 'input' })
    expect(getPanelsFor(layoutDef).some((p) => p.id === 'test-pr-applicable')).toBe(true)
    expect(getPanelsFor(inputDef).some((p) => p.id === 'test-pr-applicable')).toBe(false)
  })

  it('getPanelsFor honors applicablePanels whitelist over applicableTo', () => {
    registerPanel({
      id: 'test-pr-applicable',
      displayName: 'Apply',
      order: 999,
      // Predicate would normally allow:
      applicableTo: () => true,
      component: Noop,
    })
    // Whitelist excludes our test panel id:
    const def = makeDef({ applicablePanels: ['spacing'] as never })
    expect(getPanelsFor(def).some((p) => p.id === 'test-pr-applicable')).toBe(false)
  })
})
