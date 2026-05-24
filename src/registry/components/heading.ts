import { z } from 'zod'
import { registerComponent } from '../registry'

export const headingPropsSchema = z.object({
  level: z.enum(['1', '2', '3', '4', '5', '6']),
  content: z.string(),
})
export type HeadingProps = z.infer<typeof headingPropsSchema>

registerComponent<HeadingProps>({
  id: 'heading',
  category: 'content',
  displayName: 'Heading',
  tags: ['title', 'h1', 'h2', 'header'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: headingPropsSchema,
  defaults: {
    props: { level: '2', content: 'Heading' },
    style: { classes: { root: 'text-2xl font-bold text-foreground' } },
  },
})
