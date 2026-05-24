import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnStack({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { direction, gap } = props as {
    direction: 'vertical' | 'horizontal'
    gap: string
  }
  // Direction + gap are first-class props (PropsPanel), composed into Tailwind
  // utilities here. User-authored classes in style.classes.root (background,
  // padding, etc.) come through `className` and merge alongside.
  const dirClass = direction === 'vertical' ? 'flex-col' : 'flex-row'
  return (
    <div
      ref={rootRef}
      className={cn('flex', dirClass, `gap-${gap}`, className)}
      style={inlineStyle}
    >
      {children}
    </div>
  )
}
