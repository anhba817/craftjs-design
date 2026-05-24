import { z } from 'zod'
import { registerComponent } from '../registry'

export const checkboxPropsSchema = z.object({
  label: z.string(),
  checked: z.boolean(),
  disabled: z.boolean(),
})
export type CheckboxProps = z.infer<typeof checkboxPropsSchema>

registerComponent<CheckboxProps>({
  id: 'checkbox',
  category: 'input',
  displayName: 'Checkbox',
  tags: ['form', 'toggle'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: checkboxPropsSchema,
  defaults: {
    props: { label: 'Checkbox', checked: false, disabled: false },
    style: { classes: { root: '' } },
  },
  applicablePanels: ['spacing', 'size', 'appearance', 'effects', 'componentProps'],
})
