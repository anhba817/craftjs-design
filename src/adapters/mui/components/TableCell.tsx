import { cn } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// TableCell — same shape as the shadcn impl (a plain div is the right
// primitive for a cell content holder; MUI has no equivalent).
export function MaterialTableCell({
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
