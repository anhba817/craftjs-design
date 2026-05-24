import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnDivider({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { orientation } = props as { orientation: 'horizontal' | 'vertical' }
  // shadcn Separator is forwardRef-wrapped (Radix primitive) — pass ref directly.
  return (
    <Separator
      ref={rootRef as never}
      orientation={orientation}
      className={cn(className)}
      style={inlineStyle}
    />
  )
}
