import { useEditor, useNode } from '@craftjs/core'
import { cn } from '@design/sdk'
import {
  containingMerge,
  isCellCovered,
  tableCellSlotKey,
  type TableProps,
} from '@/registry/components/table'
import { CellResizeHandles } from '../../_shared/CellResizeHandles'
import type { AdapterRenderProps } from '../../types'

// Table — same shape as the shadcn impl. Cells are TableCell canonicals
// (per-cell styling via the standard Inspector); merges render with
// colSpan/rowSpan and skip covered cells.
export function MaterialTable({
  props,
  rootRef,
  className,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  const tp = props as TableProps
  const { rows, cols } = tp
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
