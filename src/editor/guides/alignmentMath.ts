// Phase 11 § 3.6 — pure alignment math for the drag-guide overlay.
//
// The overlay listens to Craft's HTML5-drag events (dragover on the
// canvas viewport) and compares the dragged node's bbox against each
// sibling's bbox to find edge alignments. Lines are drawn when an
// alignment falls within `threshold` pixels.
//
// Path-taken note: Craft's drag is insertion-index-based — the dragged
// element doesn't actually move during drag (HTML5 drag-and-drop renders
// a "drag image" ghost; the source stays put). So our guides are
// VISUAL-ONLY for v1: drop still goes through Craft's normal move(id,
// parent, index) on dragend, no coordinate snap. Designers get the
// alignment hint without us replacing Craft's drag layer. See
// docs/plans/PHASE11_PLAN.md Group E for the decision history.

/** Axis along which an alignment line runs. */
export type GuideAxis = 'horizontal' | 'vertical'

/**
 * A single edge alignment match. `position` is the on-screen
 * coordinate (px) along the matched axis: the horizontal line's y
 * coordinate or the vertical line's x coordinate.
 *
 * `draggedEdge` / `siblingEdge` name which edges matched so the
 * overlay or a debugger can label them. Values:
 *   - horizontal: 'top' | 'bottom' | 'vCenter'
 *   - vertical:   'left' | 'right' | 'hCenter'
 */
export interface AlignmentMatch {
  axis: GuideAxis
  position: number
  draggedEdge: EdgeName
  siblingEdge: EdgeName
  /** Sibling whose edge matched — used by callers that want to
   *  highlight the partner element. */
  siblingId: string
  /** Absolute distance between dragged and sibling edges (px). */
  delta: number
}

export type EdgeName =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'hCenter'
  | 'vCenter'

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface SiblingRect extends Rect {
  id: string
}

/**
 * Compute alignment matches between `dragged` and each sibling.
 *
 * For each axis (horizontal = y-line, vertical = x-line) and each
 * edge of the dragged rect, find the SINGLE nearest sibling edge
 * within `threshold`. At most one match per (axis, draggedEdge) pair
 * — the closest sibling wins. The overlay typically renders only the
 * two nearest matches (one per axis) to avoid clutter.
 *
 * Returns matches sorted by delta ascending. Empty when no edges
 * align within threshold.
 *
 * Pure helper — pixels in, matches out. Pulled into its own module
 * so it's testable without a DOM and without Craft.
 */
export function alignmentMatches(
  dragged: Rect,
  siblings: readonly SiblingRect[],
  threshold: number = 4,
): AlignmentMatch[] {
  const hCenter = (dragged.left + dragged.right) / 2
  const vCenter = (dragged.top + dragged.bottom) / 2

  // Per draggedEdge × siblingEdge candidate matches. We pick the
  // nearest sibling for each pair and discard the rest.
  const candidates: AlignmentMatch[] = []

  // Vertical alignments (x-line): compare left / right / hCenter.
  const verticalDraggedEdges: ReadonlyArray<[EdgeName, number]> = [
    ['left', dragged.left],
    ['right', dragged.right],
    ['hCenter', hCenter],
  ]
  const verticalSiblingEdges: ReadonlyArray<[EdgeName, (r: Rect) => number]> = [
    ['left', (r) => r.left],
    ['right', (r) => r.right],
    ['hCenter', (r) => (r.left + r.right) / 2],
  ]

  for (const [dEdge, dCoord] of verticalDraggedEdges) {
    for (const [sEdge, sExtract] of verticalSiblingEdges) {
      const best = nearestSiblingEdge(siblings, dCoord, sExtract, threshold)
      if (best) {
        candidates.push({
          axis: 'vertical',
          position: best.coord,
          draggedEdge: dEdge,
          siblingEdge: sEdge,
          siblingId: best.id,
          delta: best.delta,
        })
      }
    }
  }

  // Horizontal alignments (y-line): top / bottom / vCenter.
  const horizontalDraggedEdges: ReadonlyArray<[EdgeName, number]> = [
    ['top', dragged.top],
    ['bottom', dragged.bottom],
    ['vCenter', vCenter],
  ]
  const horizontalSiblingEdges: ReadonlyArray<[EdgeName, (r: Rect) => number]> = [
    ['top', (r) => r.top],
    ['bottom', (r) => r.bottom],
    ['vCenter', (r) => (r.top + r.bottom) / 2],
  ]

  for (const [dEdge, dCoord] of horizontalDraggedEdges) {
    for (const [sEdge, sExtract] of horizontalSiblingEdges) {
      const best = nearestSiblingEdge(siblings, dCoord, sExtract, threshold)
      if (best) {
        candidates.push({
          axis: 'horizontal',
          position: best.coord,
          draggedEdge: dEdge,
          siblingEdge: sEdge,
          siblingId: best.id,
          delta: best.delta,
        })
      }
    }
  }

  candidates.sort((a, b) => a.delta - b.delta)
  return candidates
}

/**
 * Pick the two nearest matches across axes — one vertical (x-line)
 * and one horizontal (y-line) — for the overlay. The plan caps the
 * visible guide count at 2 to avoid visual clutter.
 *
 * Returns up to one match per axis, both selected for minimum delta.
 */
export function pickGuideMatches(
  matches: readonly AlignmentMatch[],
): AlignmentMatch[] {
  let vertical: AlignmentMatch | undefined
  let horizontal: AlignmentMatch | undefined
  for (const m of matches) {
    if (m.axis === 'vertical' && !vertical) vertical = m
    else if (m.axis === 'horizontal' && !horizontal) horizontal = m
    if (vertical && horizontal) break
  }
  return [vertical, horizontal].filter(
    (m): m is AlignmentMatch => m !== undefined,
  )
}

function nearestSiblingEdge(
  siblings: readonly SiblingRect[],
  draggedCoord: number,
  siblingExtract: (r: Rect) => number,
  threshold: number,
): { id: string; coord: number; delta: number } | null {
  let best: { id: string; coord: number; delta: number } | null = null
  for (const s of siblings) {
    const sCoord = siblingExtract(s)
    const delta = Math.abs(sCoord - draggedCoord)
    if (delta > threshold) continue
    if (best === null || delta < best.delta) {
      best = { id: s.id, coord: sCoord, delta }
    }
  }
  return best
}
