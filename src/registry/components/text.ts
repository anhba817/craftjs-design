import { z } from 'zod'
import { registerComponent } from '../registry'

export const textPropsSchema = z.object({
  content: z.string(),
})
export type TextProps = z.infer<typeof textPropsSchema>

registerComponent<TextProps>({
  id: 'text',
  category: 'content',
  displayName: 'Text',
  tags: ['text', 'paragraph'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: textPropsSchema,
  defaults: {
    props: { content: 'Text' },
    // text-foreground means the Text follows the active theme's foreground token
    // automatically. The Typography panel will let users change to text-primary,
    // text-muted-foreground, etc.
    style: { classes: { root: 'text-base text-foreground' } },
  },
})
