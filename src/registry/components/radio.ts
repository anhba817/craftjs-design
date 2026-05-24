import { z } from 'zod'
import { registerComponent } from '../registry'

// Same array-options caveat as Select — PropsPanel renders "unsupported" for
// the options field until ZodArray support lands.
export const radioPropsSchema = z.object({
  name: z.string(),
  options: z.array(
    z.object({ value: z.string(), label: z.string() }),
  ),
  selectedValue: z.string(),
  disabled: z.boolean(),
})
export type RadioProps = z.infer<typeof radioPropsSchema>

registerComponent<RadioProps>({
  id: 'radio',
  category: 'input',
  displayName: 'Radio',
  tags: ['form', 'radio-group', 'choice'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: radioPropsSchema,
  defaults: {
    props: {
      name: 'radio-group',
      options: [
        { value: 'option-1', label: 'Option 1' },
        { value: 'option-2', label: 'Option 2' },
        { value: 'option-3', label: 'Option 3' },
      ],
      selectedValue: 'option-1',
      disabled: false,
    },
    style: { classes: { root: '' } },
  },
  applicablePanels: ['spacing', 'size', 'appearance', 'effects', 'componentProps'],
})
