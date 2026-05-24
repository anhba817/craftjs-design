import { z } from 'zod'
import { registerComponent } from '../registry'

export const avatarPropsSchema = z.object({
  src: z.string(),
  alt: z.string(),
  // Two-letter fallback shown when src is empty or fails to load.
  fallback: z.string(),
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
    props: { src: '', alt: 'Avatar', fallback: 'AB' },
    style: { classes: { root: '' } },
  },
})
