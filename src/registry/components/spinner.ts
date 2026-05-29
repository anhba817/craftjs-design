import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.4 — Spinner. Leaf indeterminate loading indicator.
// `size` is a fixed enum (sm/base/lg/xl) so the canonical maps cleanly
// to library primitives that use fixed sizes (lucide stroke + MUI's
// own size prop). Style slot stays for designers who want to tint via
// `color: text-...`.
export const SPINNER_SIZES = ['sm', 'base', 'lg', 'xl'] as const

export const spinnerPropsSchema = z.object({
  size: z.enum(SPINNER_SIZES),
})
export type SpinnerProps = z.infer<typeof spinnerPropsSchema>

registerComponent<SpinnerProps>({
  id: 'spinner',
  category: 'feedback',
  displayName: 'Spinner',
  tags: ['loader', 'loading', 'indeterminate', 'busy'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: spinnerPropsSchema,
  defaults: {
    props: { size: 'base' },
    style: { classes: { root: 'text-primary' } },
  },
})
