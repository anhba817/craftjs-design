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
    // min-h-16 + p-4 + dashed border mirrors Box's "visible drop
    // zone" default. Without a min-height a freshly-dropped Stack
    // has zero children and zero intrinsic size, so it collapses
    // to 0 px tall and the user can't tell it landed (and can't
    // drop into it). The dashed border + padding match the rest
    // of the layout-canonical visual language.
    props: { direction: 'vertical', gap: '4' },
    style: {
      classes: {
        root: 'min-h-16 p-4 border border-dashed border-border rounded-md bg-card',
      },
    },
  },
})
