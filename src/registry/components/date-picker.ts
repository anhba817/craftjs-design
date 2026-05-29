import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.6 — DatePicker. Leaf wrapping `<input type="date">` so we
// get the native browser calendar without taking on a date library
// dependency. `value` / `min` / `max` are ISO YYYY-MM-DD strings — empty
// string is allowed for unset.
export const datePickerPropsSchema = z.object({
  value: z.string(),
  min: z.string(),
  max: z.string(),
  disabled: z.boolean(),
})
export type DatePickerProps = z.infer<typeof datePickerPropsSchema>

registerComponent<DatePickerProps>({
  id: 'date-picker',
  category: 'input',
  displayName: 'Date Picker',
  tags: ['date', 'calendar', 'form', 'input'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: datePickerPropsSchema,
  defaults: {
    props: { value: '', min: '', max: '', disabled: false },
    style: { classes: { root: '' } },
  },
})
