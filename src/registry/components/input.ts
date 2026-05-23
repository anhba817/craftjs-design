import { z } from 'zod'
import { registerComponent } from '../registry'

export const inputPropsSchema = z.object({
  type: z.enum(['text', 'email', 'password', 'number']),
  placeholder: z.string(),
  value: z.string(),
  disabled: z.boolean(),
})
export type InputProps = z.infer<typeof inputPropsSchema>

registerComponent<InputProps>({
  id: 'input',
  category: 'input',
  displayName: 'Input',
  tags: ['form', 'field'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: inputPropsSchema,
  defaults: {
    props: { type: 'text', placeholder: 'Enter text…', value: '', disabled: false },
    style: { classes: { root: '' } },
  },
})
