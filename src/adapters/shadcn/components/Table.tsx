import { useEditor, useNode } from '@craftjs/core'
import { cn } from '@design/sdk'
import {
  containingMerge,
  isCellCovered,
  tableCellSlotKey,
  type TableProps,
} from '@design/sdk'
import { CellResizeHandles } from '../../_shared/CellResizeHandles'
import type { AdapterRenderProps } from '../../types'

// Table (Phase 13 § 5.1) — single composite. rows × cols cells are
// Pattern B Craft canvas slots; the parent declares `slotComponent:
// 'table-cell'` so each slot is a TableCell canonical with its own
// NodeStyle (border, bg, padding edited per cell via the standard
// Inspector panels). Merges (rectangular spans) skip the covered cells
// and render `<td colSpan/rowSpan>` at the top-left.
export function ShadcnTable({
  props,
  rootRef,
  className,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  const tp = props as TableProps
  const { rows, cols } = tp
  // Tolerate older nodes saved before these arrays existed.
  const colWidths = tp.colWidths ?? []
  const rowHeights = tp.rowHeights ?? []
  const merges = tp.merges ?? []
  const { id: tableId } = useNode()
  const { enabled } = useEditor((state) => ({
    enabled: state.options.enabled,
  }))
  const hasColWidths = colWidths.some((w) => w !== '')

  return (
    <table
      ref={rootRef as never}
      className={cn(
        'w-full text-sm border-collapse',
        composedClasses.root,
        className,
      )}
      style={{
        ...composedInlineStyles.root,
        ...(hasColWidths ? { tableLayout: 'fixed' as const } : {}),
      }}
    >
      {hasColWidths && (
        <colgroup>
          {Array.from({ length: cols }, (_, c) => (
            <col
              key={c}
              style={colWidths[c] ? { width: colWidths[c] } : undefined}
            />
          ))}
        </colgroup>
      )}
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr
            key={r}
            style={rowHeights[r] ? { height: rowHeights[r] } : undefined}
          >
            {Array.from({ length: cols }, (_, c) => {
              if (isCellCovered(r, c, merges, rows, cols)) return null
              const merge = containingMerge(r, c, merges, rows, cols)
              const slot = tableCellSlotKey(r, c)
              return (
                <td
                  key={slot}
                  colSpan={merge?.colSpan}
                  rowSpan={merge?.rowSpan}
                  // Structural only — the visual border / bg lives on the
                  // TableCell canonical's NodeStyle (composedClasses.root
                  // applied in TableCell adapter). The 1px height is the
                  // table-cell hack that lets canvas-slot's height:100%
                  // resolve to the row's actual height.
                  className="relative align-top p-0"
                  style={{ height: 1 }}
                >
                  {slotChildren[slot]}
                  {enabled && (
                    <CellResizeHandles
                      tableId={tableId}
                      rowIdx={r}
                      colIdx={c}
                      rows={rows}
                      cols={cols}
                    />
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
