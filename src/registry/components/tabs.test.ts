import { describe, expect, it } from 'vitest'
import { tabSlotKeys, tabsPropsSchema, uniqueTabValues } from './tabs'
import { defaultValueFor } from '@/editor/inspector/fields/defaults'

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

describe('tabSlotKeys (Phase 10 § 2.11)', () => {
  it('uses `id` directly when present', () => {
    expect(
      tabSlotKeys([
        { id: 'tab-foo', value: 'a' },
        { id: 'tab-bar', value: 'b' },
      ]),
    ).toEqual(['tab-tab-foo', 'tab-tab-bar'])
  })

  it('falls back to uniqueTabValues when `id` is missing', () => {
    expect(
      tabSlotKeys([
        { value: 'a' },
        { value: '' },
        { value: 'a' },
      ]),
    ).toEqual(['tab-a', 'tab-_unset_1', 'tab-a__1'])
  })

  it('mixes id-bearing and id-less tabs cleanly', () => {
    expect(
      tabSlotKeys([
        { id: 'pinned', value: 'a' },
        { value: 'b' },
      ]),
    ).toEqual(['tab-pinned', 'tab-b'])
  })

  it('returns an empty array on empty input', () => {
    expect(tabSlotKeys([])).toEqual([])
  })
})

describe('tab schema — defaultValueFor seeds a fresh id', () => {
  it('the new tab object has a non-empty id string', () => {
    // ArrayField calls defaultValueFor against the element schema. With
    // the Phase 10 `id: z.string().default(() => ...)` field, this path
    // must produce a fresh id rather than '' (which would break the
    // slot-key contract).
    const tabElement = tabsPropsSchema.shape.tabs.element
    const seed = defaultValueFor(tabElement) as {
      id: string
      value: string
      label: string
    }
    expect(typeof seed.id).toBe('string')
    expect(seed.id.length).toBeGreaterThan(0)
    expect(seed.value).toBe('')
    expect(seed.label).toBe('')
  })

  it('two consecutive seeds get distinct ids', () => {
    const tabElement = tabsPropsSchema.shape.tabs.element
    const a = defaultValueFor(tabElement) as { id: string }
    const b = defaultValueFor(tabElement) as { id: string }
    expect(a.id).not.toBe(b.id)
  })
})
