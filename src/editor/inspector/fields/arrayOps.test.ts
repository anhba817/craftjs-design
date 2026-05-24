import { describe, expect, it } from 'vitest'
import { removeAt, reorder, setAt, swap } from './arrayOps'

describe('reorder', () => {
  it('moves an item to a later position (shifts items up)', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 1, 3)).toEqual(['a', 'c', 'd', 'b'])
  })

  it('moves an item to an earlier position (shifts items down)', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('is a no-op when from equals to', () => {
    const items = ['a', 'b', 'c']
    expect(reorder(items, 1, 1)).toBe(items)
  })

  it('clamps the to-index to the end of the array', () => {
    expect(reorder(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a'])
  })

  it('returns the original array when from is out of range', () => {
    const items = ['a', 'b']
    expect(reorder(items, -1, 0)).toBe(items)
    expect(reorder(items, 5, 0)).toBe(items)
  })

  it('does not mutate the original array', () => {
    const items = ['a', 'b', 'c']
    reorder(items, 0, 2)
    expect(items).toEqual(['a', 'b', 'c'])
  })
})

describe('removeAt', () => {
  it('removes the item at the given index', () => {
    expect(removeAt(['a', 'b', 'c'], 1)).toEqual(['a', 'c'])
  })

  it('returns the original array on out-of-range index', () => {
    const items = ['a', 'b']
    expect(removeAt(items, -1)).toBe(items)
    expect(removeAt(items, 5)).toBe(items)
  })
})

describe('setAt', () => {
  it('replaces the item at the given index', () => {
    expect(setAt(['a', 'b', 'c'], 1, 'X')).toEqual(['a', 'X', 'c'])
  })

  it('does not mutate the original array', () => {
    const items = ['a', 'b']
    setAt(items, 0, 'X')
    expect(items).toEqual(['a', 'b'])
  })
})

describe('swap', () => {
  it('exchanges two positions', () => {
    expect(swap(['a', 'b', 'c'], 0, 2)).toEqual(['c', 'b', 'a'])
  })

  it('is a no-op when a equals b', () => {
    const items = ['a', 'b']
    expect(swap(items, 0, 0)).toBe(items)
  })

  it('returns the original array on out-of-range indices', () => {
    const items = ['a', 'b']
    expect(swap(items, -1, 1)).toBe(items)
    expect(swap(items, 0, 5)).toBe(items)
  })
})
