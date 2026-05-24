import { z } from 'zod'
import { registerComponent } from '../registry'

export const stackPropsSchema = z.object({
  direction: z.enum(['vertical', 'horizontal']),
  gap: z.enum(['0', '1', '2', '4', '6', '8']),
})
export type StackProps = z.infer<typeof stackPropsSchema>

// Stack is sugar over a flex Box. Direction + gap are first-class props; users
// edit those via PropsPanel rather than fiddling with Tailwind classes. The
// adapter impl composes flex-col/flex-row + gap-{value} from these props
// alongside any user-authored classes in style.classes.root.
registerComponent<StackProps>({
  id: 'stack',
  category: 'layout',
  displayName: 'Stack',
  tags: ['flex', 'vstack', 'hstack', 'layout'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: stackPropsSchema,
  defaults: {
    props: { direction: 'vertical', gap: '4' },
    style: { classes: { root: '' } },
  },
})
