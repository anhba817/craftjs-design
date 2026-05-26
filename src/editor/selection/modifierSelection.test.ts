import { describe, expect, it } from 'vitest'
import { extendRange, toggleId } from './modifierSelection'

describe('toggleId', () => {
  it('appends when id not present', () => {
    expect(toggleId([], 'a')).toEqual(['a'])
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b'])
  })

  it('removes when id already present', () => {
    expect(toggleId(['a'], 'a')).toEqual([])
    expect(toggleId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('preserves order on remove', () => {
    expect(toggleId(['a', 'b', 'c'], 'a')).toEqual(['b', 'c'])
  })
})

describe('extendRange', () => {
  const siblings = ['s1', 's2', 's3', 's4', 's5'] as const

  it('returns [target] when current is empty', () => {
    expect(extendRange([], 's3', siblings)).toEqual(['s3'])
  })

  it('extends downward from anchor', () => {
    // Anchor = s2 (oldest in current), target = s4 → range s2..s4
    expect(extendRange(['s2'], 's4', siblings)).toEqual(['s2', 's3', 's4'])
  })

  it('extends upward from anchor', () => {
    expect(extendRange(['s4'], 's2', siblings)).toEqual(['s2', 's3', 's4'])
  })

  it('keeps cross-parent extras', () => {
    // x1 isn't in siblings; should survive the range merge.
    expect(extendRange(['x1', 's3'], 's5', siblings)).toEqual([
      'x1',
      's3',
      's4',
      's5',
    ])
  })

  it('falls back to [target] when no current id is a sibling', () => {
    expect(extendRange(['x1', 'x2'], 's3', siblings)).toEqual(['s3'])
  })

  it('returns [target] when target is not a sibling (defensive)', () => {
    expect(extendRange(['s1'], 'nope', siblings)).toEqual(['nope'])
  })

  it('deduplicates within the resulting range', () => {
    // s2 was already in current; final range still has s2 once.
    expect(extendRange(['s2'], 's4', siblings).filter((x) => x === 's2'))
      .toHaveLength(1)
  })
})
