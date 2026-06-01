import { cn } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// TableCell (Phase 13 § 5.1) — a thin div that hosts the cell's content
// (`children` from Craft) and carries the cell's NodeStyle classes /
// inline style. The `canvas-slot` class triggers the empty-state
// "Drop here" hint via global CSS and (combined with the table-cell
// `height: 1px` hack) makes the drop zone fill the parent <td>.
export function ShadcnTableCell({
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  return (
    <div
      ref={rootRef}
      className={cn('canvas-slot', className)}
      style={inlineStyle}
    >
      {children}
    </div>
  )
}
