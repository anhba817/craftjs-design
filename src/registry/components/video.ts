import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.7 — Video. Leaf wrapping a native `<video>`. We rely on
// the browser's built-in player UI (controls=true) — taking on a video
// library would dwarf the rest of Phase 13's bundle for a thin wrapper.
// autoplay implies muted in modern browsers (otherwise the play is
// blocked); designers can still drive the boolean explicitly.
export const videoPropsSchema = z.object({
  src: z.string(),
  poster: z.string(),
  controls: z.boolean(),
  autoplay: z.boolean(),
  loop: z.boolean(),
  muted: z.boolean(),
})
export type VideoProps = z.infer<typeof videoPropsSchema>

registerComponent<VideoProps>({
  id: 'video',
  category: 'media',
  displayName: 'Video',
  tags: ['media', 'film', 'movie'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: videoPropsSchema,
  defaults: {
    props: {
      src: 'https://www.w3schools.com/html/mov_bbb.mp4',
      poster: '',
      controls: true,
      autoplay: false,
      loop: false,
      muted: false,
    },
    style: { classes: { root: 'w-full' } },
  },
})
