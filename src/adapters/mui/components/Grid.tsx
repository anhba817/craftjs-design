import MuiBox from '@mui/material/Box'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

// Grid (Phase 13 § 5.5). Layout primitives are intentionally near-identical
// across adapters (same CSS Grid + Tailwind gap utility) — MUI's `<Grid>`
// has its own legacy API; using a Box with the same inline grid-template
// keeps the two adapters visually consistent.
export function MaterialGrid({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { cols, gap } = props as { cols: number; gap: string }
  return (
    <MuiBox
      ref={rootRef as never}
      className={cn('grid', `gap-${gap}`, className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        ...inlineStyle,
      }}
    >
      {children}
    </MuiBox>
  )
}
