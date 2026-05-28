import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.5 — Grid container. `cols` is the column count; the adapter
// composes `gridTemplateColumns: repeat(cols, minmax(0,1fr))` inline (no
// safelist work needed for arbitrary column counts). `gap` uses the same
// token scale as Stack so the two share the PropsPanel + safelist entries.
export const gridPropsSchema = z.object({
  cols: z.number().int().min(1).max(12),
  gap: z.enum(['0', '1', '2', '4', '6', '8']),
})
export type GridProps = z.infer<typeof gridPropsSchema>

registerComponent<GridProps>({
  id: 'grid',
  category: 'layout',
  displayName: 'Grid',
  tags: ['layout', 'grid', 'columns'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: gridPropsSchema,
  defaults: {
    props: { cols: 3, gap: '4' },
    style: {
      classes: {
        root: 'min-h-16 p-4 border border-dashed border-border rounded-md bg-card',
      },
    },
  },
})
