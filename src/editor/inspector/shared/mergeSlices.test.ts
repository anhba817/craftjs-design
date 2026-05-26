import { describe, expect, it } from 'vitest'
import { mergeSlices } from './mergeSlices'

describe('mergeSlices', () => {
  it('returns empty merged + empty mixed for empty input', () => {
    const { merged, mixed } = mergeSlices([])
    expect(merged).toEqual({})
    expect([...mixed]).toEqual([])
  })

  it('returns the only slice verbatim when length === 1', () => {
    const only = { w: '4', h: '8' }
    const { merged, mixed } = mergeSlices([only])
    expect(merged).toEqual(only)
    expect([...mixed]).toEqual([])
  })

  it('marks a key as mixed when two slices differ', () => {
    const { merged, mixed } = mergeSlices([{ w: '4' }, { w: '8' }])
    // Mixed keys get omitted from merged (no false single value).
    expect(merged.w).toBeUndefined()
    expect([...mixed]).toEqual(['w'])
  })

  it('keeps a key in merged when all slices agree', () => {
    const { merged, mixed } = mergeSlices([
      { w: '4', h: '8' },
      { w: '4', h: '8' },
    ])
    expect(merged).toEqual({ w: '4', h: '8' })
    expect([...mixed]).toEqual([])
  })

  it('treats "all undefined" as agreement (not mixed)', () => {
    const { merged, mixed } = mergeSlices([
      { w: undefined, h: '8' },
      { w: undefined, h: '8' },
    ])
    expect(merged.w).toBeUndefined()
    expect(merged.h).toBe('8')
    expect(mixed.has('w')).toBe(false)
  })

  it('treats "defined vs undefined" as mixed', () => {
    const { merged, mixed } = mergeSlices([{ w: '4' }, { w: undefined }])
    expect(merged.w).toBeUndefined()
    expect(mixed.has('w')).toBe(true)
  })

  it('treats "present vs absent key" as mixed', () => {
    // Second slice doesn't have `w` at all — counts as undefined,
    // disagrees with the first's `'4'`.
    const { mixed } = mergeSlices([{ w: '4' }, {}])
    expect(mixed.has('w')).toBe(true)
  })

  it('handles multi-field mixes independently', () => {
    const { merged, mixed } = mergeSlices([
      { w: '4', h: '8', m: '2' },
      { w: '8', h: '8', m: '4' },
      { w: '4', h: '8', m: '2' },
    ])
    expect(merged.h).toBe('8') // all agree
    expect(merged.w).toBeUndefined()
    expect(merged.m).toBeUndefined()
    expect(mixed.has('w')).toBe(true)
    expect(mixed.has('m')).toBe(true)
    expect(mixed.has('h')).toBe(false)
  })
})
