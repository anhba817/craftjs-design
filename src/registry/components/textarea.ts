import { z } from 'zod'
import { registerComponent } from '../registry'

export const textareaPropsSchema = z.object({
  placeholder: z.string(),
  value: z.string(),
  rows: z.number().int().min(1).max(20),
  disabled: z.boolean(),
})
export type TextareaProps = z.infer<typeof textareaPropsSchema>

registerComponent<TextareaProps>({
  id: 'textarea',
  category: 'input',
  displayName: 'Textarea',
  tags: ['form', 'multiline', 'input'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: textareaPropsSchema,
  defaults: {
    props: {
      placeholder: 'Enter text…',
      value: '',
      rows: 3,
      disabled: false,
    },
    style: { classes: { root: '' } },
  },
  applicablePanels: ['spacing', 'size', 'appearance', 'effects', 'componentProps'],
})
