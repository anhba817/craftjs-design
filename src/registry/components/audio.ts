import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.7 — Audio. Leaf wrapping a native `<audio>` with the
// browser's built-in player. No poster / muted — those are video-only
// concerns; audio's `muted` would silently shadow `controls`.
export const audioPropsSchema = z.object({
  src: z.string(),
  controls: z.boolean(),
  autoplay: z.boolean(),
  loop: z.boolean(),
})
export type AudioProps = z.infer<typeof audioPropsSchema>

registerComponent<AudioProps>({
  id: 'audio',
  category: 'media',
  displayName: 'Audio',
  tags: ['media', 'sound', 'music'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: audioPropsSchema,
  defaults: {
    props: {
      src: 'https://www.w3schools.com/html/horse.mp3',
      controls: true,
      autoplay: false,
      loop: false,
    },
    style: { classes: { root: '' } },
  },
})
