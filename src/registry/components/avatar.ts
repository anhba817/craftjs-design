import { z } from 'zod'
import { registerComponent } from '../registry'

export const avatarPropsSchema = z.object({
  src: z.string(),
  alt: z.string(),
  // Two-letter fallback shown when src is empty or fails to load.
  fallback: z.string(),
  // Phase 13 § 5.3 — overlay trigger linking. Hover-tooltip / click-popover
  // are the natural avatar interactions; modal / drawer / toast also work.
  triggers: z.array(z.string()),
})
export type AvatarProps = z.infer<typeof avatarPropsSchema>

registerComponent<AvatarProps>({
  id: 'avatar',
  category: 'display',
  displayName: 'Avatar',
  tags: ['profile', 'user', 'picture'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: avatarPropsSchema,
  defaults: {
    props: { src: '', alt: 'Avatar', fallback: 'AB', triggers: [] },
    style: { classes: { root: '' } },
  },
  hiddenPropFields: ['triggers'],
})
