import { z } from 'zod'
import { registerComponent } from '../registry'

export const switchPropsSchema = z.object({
  label: z.string(),
  checked: z.boolean(),
  disabled: z.boolean(),
})
export type SwitchProps = z.infer<typeof switchPropsSchema>

registerComponent<SwitchProps>({
  id: 'switch',
  category: 'input',
  displayName: 'Switch',
  tags: ['form', 'toggle'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: switchPropsSchema,
  defaults: {
    props: { label: 'Toggle', checked: false, disabled: false },
    style: { classes: { root: '' } },
  },
  applicablePanels: ['spacing', 'size', 'appearance', 'effects', 'componentProps'],
})
