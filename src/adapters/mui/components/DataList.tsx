import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function MaterialDataList({
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
