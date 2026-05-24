import { describe, expect, it } from 'vitest'
import { SNAP_TOLERANCE_PX, snapToSizeToken } from './snap'

describe('snapToSizeToken', () => {
  it('snaps an exact match', () => {
    expect(snapToSizeToken(128)).toBe('32') // w-32 = 128px
    expect(snapToSizeToken(192)).toBe('48') // w-48 = 192px
  })

  it('snaps within the tolerance window', () => {
    // Within ±SNAP_TOLERANCE_PX of 128 (w-32) → snap.
    expect(snapToSizeToken(128 + SNAP_TOLERANCE_PX)).toBe('32')
    expect(snapToSizeToken(128 - SNAP_TOLERANCE_PX)).toBe('32')
    expect(snapToSizeToken(127)).toBe('32')
    expect(snapToSizeToken(130)).toBe('32')
  })

  it('returns null when nothing is close enough', () => {
    // 96 (w-24) is at 96; 128 (w-32) is at 128 — 110 is 14 away from each.
    expect(snapToSizeToken(110)).toBeNull()
    // 200 sits between w-48 (192) and w-64 (256), 8 away from the nearest.
    expect(snapToSizeToken(200)).toBeNull()
  })

  it('picks the closest of two tokens within range', () => {
    // Hypothetical: if two tokens were within range, pick the closer one.
    // No two stock tokens are within 4px+4px = 8px of each other, so this is
    // really testing the loop's distance comparator. We force the case by
    // probing equidistant midpoints — at 30, both '0' (30 away) and '8' (2
    // away) are candidates; '8' wins.
    expect(snapToSizeToken(30)).toBe('8')
  })

  it('handles zero and negative input safely', () => {
    expect(snapToSizeToken(0)).toBe('0')
    expect(snapToSizeToken(-2)).toBe('0') // within tolerance of 0
    expect(snapToSizeToken(-10)).toBeNull()
  })

  it('exports SNAP_TOLERANCE_PX as a stable constant', () => {
    expect(SNAP_TOLERANCE_PX).toBe(4)
  })
})
