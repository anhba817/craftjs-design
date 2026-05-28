import { describe, expect, it } from 'vitest'
import '@/registry/components' // side-effect: registers all canonicals
import { getComponent } from '../registry'
import { containerMaxWidth } from './container'
import { spacerSizeRem, SPACER_SIZES } from './spacer'

// Phase 13 § 5.5 — registration smoke tests for the four layout primitives,
// plus the pure helpers (spacerSizeRem / containerMaxWidth).

describe('Group A layout canonicals are registered', () => {
  const cases: Array<{ id: string; isCanvas: boolean; defaults: object }> = [
    { id: 'grid', isCanvas: true, defaults: { cols: 3, gap: '4' } },
    { id: 'container', isCanvas: true, defaults: { maxWidth: 'lg' } },
    { id: 'spacer', isCanvas: false, defaults: { size: '8', axis: 'vertical' } },
    { id: 'section', isCanvas: true, defaults: { ariaLabel: '' } },
  ]

  for (const c of cases) {
    it(`${c.id} is registered with the expected shape`, () => {
      const def = getComponent(c.id)
      expect(def).toBeDefined()
      expect(def?.category).toBe('layout')
      expect(def?.isCanvas).toBe(c.isCanvas)
      expect(def?.styleSlots).toEqual(['root'])
      // defaults match
      expect(def?.defaults.props).toEqual(c.defaults)
      // and they parse via the schema
      expect(() => def?.propsSchema.parse(def?.defaults.props)).not.toThrow()
    })
  }
})

describe('spacerSizeRem', () => {
  it('maps 0 to "0"', () => {
    expect(spacerSizeRem('0')).toBe('0')
  })
  it('maps tokens to rem via the Tailwind 0.25rem scale', () => {
    expect(spacerSizeRem('4')).toBe('1rem')
    expect(spacerSizeRem('8')).toBe('2rem')
    expect(spacerSizeRem('64')).toBe('16rem')
  })
  it('covers every SPACER_SIZES entry', () => {
    for (const s of SPACER_SIZES) {
      const out = spacerSizeRem(s)
      expect(out).toMatch(/^(0|[\d.]+rem)$/)
    }
  })
})

describe('containerMaxWidth', () => {
  it('maps each token to a CSS length / 100%', () => {
    expect(containerMaxWidth('sm')).toBe('40rem')
    expect(containerMaxWidth('md')).toBe('48rem')
    expect(containerMaxWidth('lg')).toBe('64rem')
    expect(containerMaxWidth('xl')).toBe('80rem')
    expect(containerMaxWidth('2xl')).toBe('96rem')
    expect(containerMaxWidth('full')).toBe('100%')
  })
})
