import { z } from 'zod'
import { registerComponent } from '../registry'

// Note: options is a z.array(z.object(...)) — PropsPanel's auto-form doesn't
// support array fields yet (Phase 6 expansion). Users see "unsupported Zod
// kind" for the options field. The defaults provide sensible starter options;
// authors who need to customize can hand-edit the JSON in localStorage until
// the panel learns arrays.
export const selectPropsSchema = z.object({
  label: z.string(),
  options: z.array(
    z.object({ value: z.string(), label: z.string() }),
  ),
  defaultValue: z.string(),
  disabled: z.boolean(),
})
export type SelectProps = z.infer<typeof selectPropsSchema>

registerComponent<SelectProps>({
  id: 'select',
  category: 'input',
  displayName: 'Select',
  tags: ['dropdown', 'combobox', 'form'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: selectPropsSchema,
  defaults: {
    props: {
      label: 'Choose option',
      options: [
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
        { value: 'cherry', label: 'Cherry' },
      ],
      defaultValue: 'apple',
      disabled: false,
    },
    style: { classes: { root: '' } },
  },
  applicablePanels: ['spacing', 'size', 'appearance', 'effects', 'componentProps'],
})
