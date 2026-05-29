import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.3 — Tooltip. Hidden from toolbox; attached to a trigger
// component (Button) via the right-click context menu. `content` is the
// tooltip body string and `name` is the trigger key that links a
// Button's `triggers: [name]` to this tooltip.
//
// Editor: renders in the right-side OverlayStage as a card so the
// designer can see + style it. Runtime: the tooltip itself renders
// nothing — instead, the Button at runtime looks up tooltip defs from
// the runtime store keyed by `name` and wraps its label in the
// adapter's Tooltip primitive (Radix / MUI). This way hover semantics
// come from the library, not from a manual toggle.
export const tooltipPropsSchema = z.object({
  content: z.string(),
  name: z.string(),
})
export type TooltipProps = z.infer<typeof tooltipPropsSchema>

registerComponent<TooltipProps>({
  id: 'tooltip',
  category: 'feedback',
  displayName: 'Tooltip',
  tags: ['overlay', 'hint', 'hover'],
  hidden: true,
  // No children — tooltip content is the `content` string, not a
  // droppable region.
  isCanvas: false,
  styleSlots: ['root'],
  canResize: false,
  propsSchema: tooltipPropsSchema,
  defaults: {
    props: { content: 'Tooltip content', name: 'tooltip' },
    style: {
      classes: {
        root: 'rounded-md border border-border bg-card px-3 py-2 text-sm',
      },
    },
  },
})
