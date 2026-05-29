import { describe, expect, it } from 'vitest'
import '@/registry/components'
import { getComponent } from '../registry'
import { slideSlotKeys } from './carousel'

// Phase 13 § 5.7 — registration smoke for the media group + Carousel
// slide-key derivation parallel to the Tabs slot-key tests.
describe('Group G media canonicals are registered', () => {
  const cases: Array<{ id: string; displayName: string }> = [
    { id: 'video', displayName: 'Video' },
    { id: 'audio', displayName: 'Audio' },
    { id: 'carousel', displayName: 'Carousel' },
  ]

  for (const c of cases) {
    it(`${c.id} is registered`, () => {
      const def = getComponent(c.id)
      expect(def).toBeDefined()
      expect(def?.category).toBe('media')
      expect(def?.displayName).toBe(c.displayName)
      expect(() => def?.propsSchema.parse(def?.defaults.props)).not.toThrow()
    })
  }
})

describe('slideSlotKeys', () => {
  it('returns one prefixed key per slide, in input order', () => {
    const keys = slideSlotKeys([
      { id: 'slide-a' },
      { id: 'slide-b' },
      { id: 'slide-c' },
    ])
    expect(keys).toEqual(['slide-slide-a', 'slide-slide-b', 'slide-slide-c'])
  })

  it('preserves order across reorderings', () => {
    const before = [{ id: 'slide-x' }, { id: 'slide-y' }]
    const after = [...before].reverse()
    expect(slideSlotKeys(before)).toEqual([
      'slide-slide-x',
      'slide-slide-y',
    ])
    expect(slideSlotKeys(after)).toEqual([
      'slide-slide-y',
      'slide-slide-x',
    ])
  })

  it('returns an empty array for an empty slide list', () => {
    expect(slideSlotKeys([])).toEqual([])
  })
})

describe('carousel.canvasSlots', () => {
  it('derives slot keys from the slides prop at render time', () => {
    const def = getComponent('carousel')
    if (typeof def?.canvasSlots !== 'function') {
      throw new Error('carousel.canvasSlots must be a function')
    }
    const slots = def.canvasSlots({
      slides: [{ id: 'slide-one' }, { id: 'slide-two' }],
      currentSlide: 0,
    })
    expect(slots).toEqual(['slide-slide-one', 'slide-slide-two'])
  })
})
