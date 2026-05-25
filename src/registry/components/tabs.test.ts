import { describe, expect, it } from 'vitest'
import { uniqueTabValues } from './tabs'

describe('uniqueTabValues', () => {
  it('passes through values that are already unique and non-empty', () => {
    expect(
      uniqueTabValues([{ value: 'a' }, { value: 'b' }, { value: 'c' }]),
    ).toEqual(['a', 'b', 'c'])
  })

  it('synthesizes _unset_<index> for empty values', () => {
    expect(
      uniqueTabValues([{ value: '' }, { value: '' }, { value: '' }]),
    ).toEqual(['_unset_0', '_unset_1', '_unset_2'])
  })

  it('suffixes duplicate values to make them unique', () => {
    expect(
      uniqueTabValues([
        { value: 'overview' },
        { value: 'overview' },
        { value: 'overview' },
      ]),
    ).toEqual(['overview', 'overview__1', 'overview__2'])
  })

  it('handles a mix of unique, empty, and duplicate values', () => {
    expect(
      uniqueTabValues([
        { value: 'a' },
        { value: '' },
        { value: 'a' },
        { value: '' },
        { value: 'b' },
      ]),
    ).toEqual(['a', '_unset_1', 'a__1', '_unset_3', 'b'])
  })

  it('preserves index alignment — length matches input', () => {
    const tabs = Array.from({ length: 10 }, () => ({ value: '' }))
    const out = uniqueTabValues(tabs)
    expect(out).toHaveLength(10)
    expect(new Set(out).size).toBe(10) // all unique
  })

  it('returns an empty array on empty input', () => {
    expect(uniqueTabValues([])).toEqual([])
  })
})
