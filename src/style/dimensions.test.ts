import { describe, expect, it } from 'vitest'
import type { NodeStyle } from '@/registry/types'
import {
  readBucketClasses,
  readBucketInline,
  writeBucketClasses,
  writeBucketInline,
} from './dimensions'

const empty = (): NodeStyle => ({ classes: {} })

describe('readBucketClasses — 4 quadrants', () => {
  const style: NodeStyle = {
    classes: { root: 'p-4' },
    responsive: { md: { root: 'p-6' } },
    states: { hover: { root: 'bg-primary' } },
    stateResponsive: { md: { hover: { root: 'bg-secondary' } } },
  }
  it('(base, base)', () => {
    expect(readBucketClasses(style, 'root', 'base', 'base')).toBe('p-4')
  })
  it('(bp, base)', () => {
    expect(readBucketClasses(style, 'root', 'md', 'base')).toBe('p-6')
  })
  it('(base, state)', () => {
    expect(readBucketClasses(style, 'root', 'base', 'hover')).toBe('bg-primary')
  })
  it('(bp, state)', () => {
    expect(readBucketClasses(style, 'root', 'md', 'hover')).toBe('bg-secondary')
  })
  it('returns empty string for an absent bucket', () => {
    expect(readBucketClasses(empty(), 'root', 'lg', 'focus')).toBe('')
  })
})

describe('writeBucketClasses — creates each quadrant', () => {
  it('(base, base) → classes', () => {
    const s = empty()
    writeBucketClasses(s, 'root', 'base', 'base', 'p-4')
    expect(s.classes.root).toBe('p-4')
  })
  it('(bp, base) → responsive', () => {
    const s = empty()
    writeBucketClasses(s, 'root', 'md', 'base', 'p-6')
    expect(s.responsive?.md?.root).toBe('p-6')
  })
  it('(base, state) → states', () => {
    const s = empty()
    writeBucketClasses(s, 'root', 'base', 'hover', 'bg-primary')
    expect(s.states?.hover?.root).toBe('bg-primary')
  })
  it('(bp, state) → stateResponsive', () => {
    const s = empty()
    writeBucketClasses(s, 'root', 'lg', 'active', 'scale-110')
    expect(s.stateResponsive?.lg?.active?.root).toBe('scale-110')
  })
})

describe('writeBucketInline — set + container peel', () => {
  it('sets + clears base inline, peeling empty containers', () => {
    const s = empty()
    writeBucketInline(s, 'root', 'base', 'base', 'color', 'red')
    expect(s.inline?.root?.color).toBe('red')
    writeBucketInline(s, 'root', 'base', 'base', 'color', undefined)
    expect(s.inline).toBeUndefined() // peeled all the way
  })

  it('sets + clears a (bp, state) inline quadrant with full peel', () => {
    const s = empty()
    writeBucketInline(s, 'root', 'md', 'hover', 'transform', 'scale(1.1)')
    expect(s.stateResponsiveInline?.md?.hover?.root?.transform).toBe('scale(1.1)')
    writeBucketInline(s, 'root', 'md', 'hover', 'transform', undefined)
    expect(s.stateResponsiveInline).toBeUndefined()
  })

  it('keeps sibling props when clearing one', () => {
    const s = empty()
    writeBucketInline(s, 'root', 'base', 'hover', 'transform', 'scale(1.1)')
    writeBucketInline(s, 'root', 'base', 'hover', 'filter', 'blur(2px)')
    writeBucketInline(s, 'root', 'base', 'hover', 'transform', undefined)
    expect(s.stateInline?.hover?.root).toEqual({ filter: 'blur(2px)' })
  })

  it('readBucketInline reflects writes', () => {
    const s = empty()
    writeBucketInline(s, 'root', 'base', 'focus', 'outline', '2px solid')
    expect(readBucketInline(s, 'root', 'base', 'focus')).toEqual({
      outline: '2px solid',
    })
  })
})
