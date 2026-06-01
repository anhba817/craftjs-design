import { cn } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// DataList — semantic `<dl>` accepting DataListItem children. Layout is
// kept on the items (each is one row); the wrapper just provides vertical
// spacing between rows.
export function ShadcnDataList({
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  return (
    <dl
      ref={rootRef as never}
      className={cn('space-y-2', className)}
      style={inlineStyle}
    >
      {children}
    </dl>
  )
}
