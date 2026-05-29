import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.1 — Skeleton placeholder. `variant` shapes the radius (text
// = small radius, rectangle = medium, circle = full); `width` / `height`
// accept any CSS length so designers can match the real content's box.
export const SKELETON_VARIANTS = ['text', 'rectangle', 'circle'] as const

export const skeletonPropsSchema = z.object({
  variant: z.enum(SKELETON_VARIANTS),
  width: z.string(),
  height: z.string(),
})
export type SkeletonProps = z.infer<typeof skeletonPropsSchema>

registerComponent<SkeletonProps>({
  id: 'skeleton',
  category: 'display',
  displayName: 'Skeleton',
  tags: ['loading', 'placeholder', 'shimmer'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: skeletonPropsSchema,
  defaults: {
    props: { variant: 'rectangle', width: '100%', height: '8rem' },
    style: { classes: { root: 'bg-muted animate-pulse' } },
  },
})
