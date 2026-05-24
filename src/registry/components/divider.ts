import { z } from 'zod'
import { registerComponent } from '../registry'

export const dividerPropsSchema = z.object({
  orientation: z.enum(['horizontal', 'vertical']),
})
export type DividerProps = z.infer<typeof dividerPropsSchema>

registerComponent<DividerProps>({
  id: 'divider',
  category: 'layout',
  displayName: 'Divider',
  tags: ['separator', 'hr', 'rule'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: dividerPropsSchema,
  defaults: {
    props: { orientation: 'horizontal' },
    style: { classes: { root: '' } },
  },
})
