import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.6 — TimePicker. Leaf wrapping `<input type="time">` so we
// get the native time wheel UI on each platform without a library.
// Values are HH:MM strings (24-hour); empty string = unset.
export const timePickerPropsSchema = z.object({
  value: z.string(),
  min: z.string(),
  max: z.string(),
  disabled: z.boolean(),
})
export type TimePickerProps = z.infer<typeof timePickerPropsSchema>

registerComponent<TimePickerProps>({
  id: 'time-picker',
  category: 'input',
  displayName: 'Time Picker',
  tags: ['time', 'clock', 'form', 'input'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: timePickerPropsSchema,
  defaults: {
    props: { value: '', min: '', max: '', disabled: false },
    style: { classes: { root: '' } },
  },
})
