import { z } from 'zod'
import { registerComponent } from '../registry'

export const imagePropsSchema = z.object({
  src: z.string(),
  alt: z.string(),
  // Aspect ratio enum maps to Tailwind utilities at render time. 'auto' emits
  // no class; the others map to `aspect-square`, `aspect-video`. Phase 6 can
  // extend with arbitrary ratios once the doc-safelist pipeline lands.
  aspectRatio: z.enum(['auto', 'square', '16/9']),
})
export type ImageProps = z.infer<typeof imagePropsSchema>

registerComponent<ImageProps>({
  id: 'image',
  category: 'media',
  displayName: 'Image',
  tags: ['img', 'picture'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: imagePropsSchema,
  defaults: {
    props: {
      src: 'https://placehold.co/600x400',
      alt: 'Image',
      aspectRatio: 'auto',
    },
    style: { classes: { root: 'w-full' } },
  },
})
