import { describe, expect, it } from 'vitest'
import '@/registry/components'
import { getComponent } from '../registry'
import { stepperSlotKey, stepperSlotKeys } from './stepper'

// Phase 13 § 5.2 — navigation group registration smoke tests.
describe('Group C navigation canonicals are registered', () => {
  const cases: Array<{ id: string; isCanvas: boolean }> = [
    { id: 'breadcrumb', isCanvas: false },
    { id: 'pagination', isCanvas: false },
    { id: 'nav-menu', isCanvas: true },
    { id: 'nav-item', isCanvas: true },
    { id: 'stepper', isCanvas: false },
  ]

  for (const c of cases) {
    it(`${c.id} is registered with the expected shape`, () => {
      const def = getComponent(c.id)
      expect(def).toBeDefined()
      expect(def?.category).toBe('navigation')
      expect(def?.isCanvas).toBe(c.isCanvas)
      expect(def?.styleSlots).toEqual(['root'])
      // The defaults must parse via the schema.
      expect(() => def?.propsSchema.parse(def?.defaults.props)).not.toThrow()
    })
  }

  it('breadcrumb seeds a non-empty items array', () => {
    const def = getComponent('breadcrumb')
    const items = (def?.defaults.props as { items: unknown[] }).items
    expect(items.length).toBeGreaterThan(0)
  })

  it('pagination defaults to currentPage 1', () => {
    const def = getComponent('pagination')
    const p = def?.defaults.props as { currentPage: number; pageCount: number }
    expect(p.currentPage).toBe(1)
    expect(p.pageCount).toBeGreaterThanOrEqual(1)
  })

  it('stepper seeds 3 steps and starts at index 0', () => {
    const def = getComponent('stepper')
    const p = def?.defaults.props as { steps: unknown[]; currentStep: number }
    expect(p.steps.length).toBe(3)
    expect(p.currentStep).toBe(0)
  })

  it('stepper canvasSlots match the step count (Pattern B)', () => {
    const def = getComponent('stepper')
    const props = def?.defaults.props as { steps: unknown[] }
    const fn = def?.canvasSlots as (props: unknown) => readonly string[]
    expect(fn(props)).toEqual(['step-0', 'step-1', 'step-2'])
  })

  it('stepper slot key helpers are stable', () => {
    expect(stepperSlotKey(0)).toBe('step-0')
    expect(stepperSlotKey(4)).toBe('step-4')
    expect(stepperSlotKeys(2)).toEqual(['step-0', 'step-1'])
  })
})
