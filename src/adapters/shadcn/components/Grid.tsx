import { cn } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// Grid (Phase 13 § 5.5). `cols` is applied inline as
// `grid-template-columns: repeat(N, minmax(0, 1fr))` so arbitrary column
// counts don't require a safelist entry. `gap` uses the already-safelisted
// `gap-{n}` utility. Any user-authored classes / inline values come
// through `className` + `inlineStyle` and merge alongside.
export function ShadcnGrid({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { cols, gap } = props as { cols: number; gap: string }
  return (
    <div
      ref={rootRef}
      className={cn('grid', `gap-${gap}`, className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        ...inlineStyle,
      }}
    >
      {children}
    </div>
  )
}
