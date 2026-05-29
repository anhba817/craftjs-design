import { useEditor } from '@craftjs/core'

// Phase 13 § 5.1 — drag-to-resize handles embedded inside every Table cell
// (one col-handle on the cell's right edge, one row-handle on its bottom
// edge). Embedding sidesteps the DOM-measurement dance: the cell is
// `position: relative`, the handles are absolute-positioned at right/bottom
// 0, so the browser's layout positions them correctly with zero JS math.
// Dragging measures the cell's current width / row's current height via
// getBoundingClientRect at drag-start and updates the parent Table's
// `nodeProps.colWidths[col]` / `nodeProps.rowHeights[row]` via setProp.
//
// Important: the canonical's own props live under `props.nodeProps` inside
// the Craft node's data (this is the same access PropsPanel uses to write
// fields). The adapter receives the inner nodeProps as its `props`, but a
// setProp recipe gets the wrapper — so we mutate via `p.nodeProps.<field>`
// here, NOT the bare top-level `p.<field>` (that field doesn't exist on the
// wrapper and the mutation never persists).

interface CraftWrapperProps {
  nodeProps: {
    colWidths?: string[]
    rowHeights?: string[]
  }
}

const MIN_DIMENSION_PX = 24
const HIT_HALF = 3

export function CellResizeHandles({
  tableId,
  rowIdx,
  colIdx,
  rows,
  cols,
}: {
  tableId: string
  rowIdx: number
  colIdx: number
  rows: number
  cols: number
}) {
  // Empty selector → subscribe to nothing. `actions` is always returned
  // by useEditor regardless of selector; subscribing without one would
  // re-render every handle on EVERY editor state change (selection,
  // hover, etc.). With 9 cells × 2 handles each, that's a lot of work
  // on every click anywhere in the editor.
  const { actions } = useEditor(() => ({}))

  const beginDrag = (
    axis: 'col' | 'row',
    index: number,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const handle = e.currentTarget
    const td = handle.parentElement // the containing <td>
    if (!td) return

    let startSize: number
    if (axis === 'col') {
      startSize = td.getBoundingClientRect().width
    } else {
      const tr = td.parentElement
      startSize = tr?.getBoundingClientRect().height ?? 32
    }
    const startCoord = axis === 'col' ? e.clientX : e.clientY
    // Coalesce setProp calls during a drag into ONE history (undo) step.
    const throttled = actions.history.throttle(500)

    const onMove = (ev: PointerEvent) => {
      const delta =
        (axis === 'col' ? ev.clientX : ev.clientY) - startCoord
      const next = Math.max(
        MIN_DIMENSION_PX,
        Math.round(startSize + delta),
      )
      const nextValue = `${next}px`
      throttled.setProp(tableId, (p: CraftWrapperProps) => {
        const np = p.nodeProps
        if (axis === 'col') {
          if (!np.colWidths) np.colWidths = []
          while (np.colWidths.length < cols) np.colWidths.push('')
          np.colWidths[index] = nextValue
        } else {
          if (!np.rowHeights) np.rowHeights = []
          while (np.rowHeights.length < rows) np.rowHeights.push('')
          np.rowHeights[index] = nextValue
        }
      })
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  return (
    <>
      {/* Column resize handle on the cell's right edge. */}
      <div
        aria-hidden
        onPointerDown={(e) => beginDrag('col', colIdx, e)}
        className="absolute top-0 z-20 hover:bg-primary/40"
        style={{
          right: -HIT_HALF,
          width: HIT_HALF * 2,
          height: '100%',
          cursor: 'col-resize',
        }}
      />
      {/* Row resize handle on the cell's bottom edge. */}
      <div
        aria-hidden
        onPointerDown={(e) => beginDrag('row', rowIdx, e)}
        className="absolute left-0 z-20 hover:bg-primary/40"
        style={{
          bottom: -HIT_HALF,
          width: '100%',
          height: HIT_HALF * 2,
          cursor: 'row-resize',
        }}
      />
    </>
  )
}
