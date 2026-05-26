import { describe, expect, it } from 'vitest'
import { alignmentMatches, pickGuideMatches } from './alignmentMath'
import type { SiblingRect } from './alignmentMath'

// Rect helper — same fields as DOMRect's left/top/right/bottom.
function r(
  left: number,
  top: number,
  right: number,
  bottom: number,
  id?: string,
): SiblingRect {
  return { id: id ?? 'unspec', left, top, right, bottom }
}

describe('alignmentMatches', () => {
  it('returns empty when no siblings', () => {
    expect(alignmentMatches(r(0, 0, 50, 50), [])).toEqual([])
  })

  it('matches a sibling left-edge with the dragged left-edge', () => {
    // Dragged at x=100, sibling at x=100. Both lefts align.
    const dragged = r(100, 50, 200, 100)
    const sibling = r(100, 200, 180, 250, 'a')
    const matches = alignmentMatches(dragged, [sibling])
    // Should include vertical match: dragged.left ↔ sibling.left, delta 0.
    const m = matches.find(
      (x) =>
        x.axis === 'vertical' &&
        x.draggedEdge === 'left' &&
        x.siblingEdge === 'left',
    )
    expect(m).toBeDefined()
    expect(m?.delta).toBe(0)
    expect(m?.position).toBe(100)
    expect(m?.siblingId).toBe('a')
  })

  it('matches a horizontal alignment (tops align)', () => {
    const dragged = r(0, 50, 100, 100)
    const sibling = r(200, 50, 300, 80, 'a')
    const matches = alignmentMatches(dragged, [sibling])
    const m = matches.find(
      (x) =>
        x.axis === 'horizontal' &&
        x.draggedEdge === 'top' &&
        x.siblingEdge === 'top',
    )
    expect(m).toBeDefined()
    expect(m?.position).toBe(50)
  })

  it('respects the threshold (off by 5 px = no match at threshold=4)', () => {
    const dragged = r(105, 0, 200, 50)
    const sibling = r(100, 0, 180, 50, 'a')
    expect(
      alignmentMatches(dragged, [sibling], 4).filter(
        (m) => m.axis === 'vertical' && m.draggedEdge === 'left',
      ),
    ).toEqual([])
    // But 5px IS within threshold=5.
    expect(
      alignmentMatches(dragged, [sibling], 5).filter(
        (m) => m.axis === 'vertical' && m.draggedEdge === 'left',
      ).length,
    ).toBeGreaterThan(0)
  })

  it('matches centres (hCenter / vCenter)', () => {
    const dragged = r(0, 0, 100, 100) // hCenter=50, vCenter=50
    const sibling = r(50, 50, 150, 150, 'a') // left=50, top=50
    const matches = alignmentMatches(dragged, [sibling])
    expect(
      matches.find(
        (x) =>
          x.draggedEdge === 'hCenter' && x.siblingEdge === 'left',
      ),
    ).toBeDefined()
    expect(
      matches.find(
        (x) =>
          x.draggedEdge === 'vCenter' && x.siblingEdge === 'top',
      ),
    ).toBeDefined()
  })

  it('picks the NEAREST sibling when multiple align within threshold', () => {
    const dragged = r(100, 0, 200, 50)
    const nearer = r(101, 200, 180, 250, 'near') // delta 1
    const farther = r(103, 300, 180, 350, 'far') // delta 3
    const matches = alignmentMatches(dragged, [nearer, farther])
    const m = matches.find(
      (x) =>
        x.axis === 'vertical' &&
        x.draggedEdge === 'left' &&
        x.siblingEdge === 'left',
    )
    expect(m?.siblingId).toBe('near')
    expect(m?.delta).toBe(1)
  })

  it('matches multiple axes simultaneously', () => {
    // Sibling is to the right but at the same y; tops should align.
    // Sibling's right edge also happens to align with dragged's left.
    const dragged = r(120, 0, 220, 100)
    const sibling = r(20, 0, 120, 100, 'a')
    const matches = alignmentMatches(dragged, [sibling])
    expect(matches.some((m) => m.axis === 'horizontal')).toBe(true)
    expect(matches.some((m) => m.axis === 'vertical')).toBe(true)
  })

  it('returns matches sorted by delta ascending', () => {
    const dragged = r(0, 0, 100, 100)
    // Two siblings: one exact-align, one off by 3 px.
    const exact = r(0, 200, 100, 300, 'exact')
    const close = r(3, 200, 103, 300, 'close')
    const matches = alignmentMatches(dragged, [exact, close])
    expect(matches[0].delta).toBeLessThanOrEqual(matches[1]?.delta ?? Infinity)
  })
})

describe('pickGuideMatches', () => {
  it('returns at most one match per axis', () => {
    const matches = alignmentMatches(
      r(0, 0, 100, 100),
      [r(0, 200, 100, 300, 'a'), r(50, 250, 150, 350, 'b')],
    )
    const picked = pickGuideMatches(matches)
    const axes = picked.map((m) => m.axis)
    expect(axes.length).toBeLessThanOrEqual(2)
    // No duplicate axis in the picked set.
    expect(new Set(axes).size).toBe(axes.length)
  })

  it('picks the smallest-delta match per axis', () => {
    const matches = alignmentMatches(
      r(0, 0, 100, 100),
      // 'a' = exact horizontal top match. 'b' = vertical left-edge by 2.
      [r(2, 200, 100, 300, 'b'), r(50, 0, 150, 80, 'a')],
    )
    const picked = pickGuideMatches(matches)
    expect(picked.length).toBe(2)
    // Both should be the smallest-delta matches; the helper itself
    // selects from a pre-sorted list, so the first occurrence of each
    // axis is the nearest.
    for (const m of picked) {
      const otherSameAxis = matches.filter((x) => x.axis === m.axis)
      const minDelta = Math.min(...otherSameAxis.map((x) => x.delta))
      expect(m.delta).toBe(minDelta)
    }
  })

  it('returns 0 entries when there are no matches', () => {
    expect(pickGuideMatches([])).toEqual([])
  })

  it('returns 1 entry when only one axis aligns', () => {
    // Dragged top aligns with sibling top, but lefts are far apart.
    const matches = alignmentMatches(
      r(0, 50, 100, 100),
      [r(500, 50, 600, 100, 'a')],
    )
    const picked = pickGuideMatches(matches)
    expect(picked.length).toBe(1)
    expect(picked[0].axis).toBe('horizontal')
  })
})
