import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.4 — Progress. Leaf. `value` is a percentage (0–100);
// `variant` picks linear bar vs circular ring. Both adapters render a
// real determinate progress primitive — designers see the actual fill
// at the chosen value in editing mode.
export const PROGRESS_VARIANTS = ['linear', 'circular'] as const

export const progressPropsSchema = z.object({
  value: z.number().min(0).max(100),
  variant: z.enum(PROGRESS_VARIANTS),
})
export type ProgressProps = z.infer<typeof progressPropsSchema>

registerComponent<ProgressProps>({
  id: 'progress',
  category: 'feedback',
  displayName: 'Progress',
  tags: ['progress', 'bar', 'percentage', 'loading'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: progressPropsSchema,
  defaults: {
    props: { value: 40, variant: 'linear' },
    style: { classes: { root: 'w-full' } },
  },
})
