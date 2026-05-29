import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.3 — Popover. Hidden from toolbox; attached to a trigger
// component (Button) via the right-click context menu. `name` is the
// trigger key. Children render as the popover body — Pattern A canvas
// so designers can drop rich content (text, inputs, lists).
//
// Editor: renders in the OverlayStage so the designer can drop content
// in + style it. Runtime: the popover node itself renders nothing.
// Instead, the Button at runtime looks up popover defs from the runtime
// store and wraps its label in the adapter's Popover primitive (Radix /
// MUI), passing the registered children as the popover body. Click
// semantics come from the library, not a manual toggle.
export const popoverPropsSchema = z.object({
  name: z.string(),
})
export type PopoverProps = z.infer<typeof popoverPropsSchema>

registerComponent<PopoverProps>({
  id: 'popover',
  category: 'feedback',
  displayName: 'Popover',
  tags: ['overlay', 'click', 'menu'],
  hidden: true,
  isCanvas: true,
  styleSlots: ['root'],
  canResize: false,
  propsSchema: popoverPropsSchema,
  defaults: {
    props: { name: 'popover' },
    style: {
      classes: {
        root: 'rounded-md border border-border bg-popover p-3 text-sm shadow-md',
      },
    },
  },
})
