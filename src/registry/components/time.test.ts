import { describe, expect, it } from 'vitest'
import '@/registry/components'
import { getComponent } from '../registry'

// Phase 13 § 5.6 — registration smoke tests for the time group.
describe('Group F time canonicals are registered', () => {
  const cases: Array<{ id: string; displayName: string }> = [
    { id: 'date-picker', displayName: 'Date Picker' },
    { id: 'time-picker', displayName: 'Time Picker' },
    { id: 'date-range-picker', displayName: 'Date Range' },
  ]

  for (const c of cases) {
    it(`${c.id} is registered as an input leaf`, () => {
      const def = getComponent(c.id)
      expect(def).toBeDefined()
      expect(def?.category).toBe('input')
      expect(def?.displayName).toBe(c.displayName)
      expect(def?.isCanvas).toBe(false)
      expect(() => def?.propsSchema.parse(def?.defaults.props)).not.toThrow()
    })
  }

  it('date / time pickers accept empty + bounded values', () => {
    const dp = getComponent('date-picker')
    expect(() =>
      dp?.propsSchema.parse({
        value: '2026-01-01',
        min: '2026-01-01',
        max: '2026-12-31',
        disabled: false,
      }),
    ).not.toThrow()
    expect(() =>
      dp?.propsSchema.parse({ value: '', min: '', max: '', disabled: false }),
    ).not.toThrow()

    const tp = getComponent('time-picker')
    expect(() =>
      tp?.propsSchema.parse({
        value: '09:30',
        min: '08:00',
        max: '17:00',
        disabled: false,
      }),
    ).not.toThrow()
  })

  it('date range picker carries start + end + bounds', () => {
    const def = getComponent('date-range-picker')
    expect(() =>
      def?.propsSchema.parse({
        start: '2026-01-01',
        end: '2026-01-07',
        min: '',
        max: '',
        disabled: false,
      }),
    ).not.toThrow()
  })
})
