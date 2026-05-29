import { describe, expect, it } from 'vitest'
import '@/registry/components'
import { getComponent } from '../registry'

// Phase 13 § 5.4 — registration smoke tests for the feedback group.
describe('Group E feedback canonicals are registered', () => {
  it('progress is registered with linear + circular variants', () => {
    const def = getComponent('progress')
    expect(def).toBeDefined()
    expect(def?.category).toBe('feedback')
    expect(def?.isCanvas).toBe(false)
    expect(() => def?.propsSchema.parse(def?.defaults.props)).not.toThrow()
    // Both variants parse — guards against future enum-shape regressions.
    expect(() =>
      def?.propsSchema.parse({ value: 0, variant: 'linear' }),
    ).not.toThrow()
    expect(() =>
      def?.propsSchema.parse({ value: 100, variant: 'circular' }),
    ).not.toThrow()
  })

  it('progress.value is clamped at the schema level', () => {
    const def = getComponent('progress')
    // Outside [0, 100] should reject — adapters also clamp defensively
    // at render time but the schema is the authoritative gate.
    expect(() =>
      def?.propsSchema.parse({ value: -1, variant: 'linear' }),
    ).toThrow()
    expect(() =>
      def?.propsSchema.parse({ value: 101, variant: 'linear' }),
    ).toThrow()
  })

  it('spinner is registered with size enum', () => {
    const def = getComponent('spinner')
    expect(def).toBeDefined()
    expect(def?.category).toBe('feedback')
    expect(def?.isCanvas).toBe(false)
    expect(() => def?.propsSchema.parse(def?.defaults.props)).not.toThrow()
    for (const size of ['sm', 'base', 'lg', 'xl']) {
      expect(() => def?.propsSchema.parse({ size })).not.toThrow()
    }
  })
})
