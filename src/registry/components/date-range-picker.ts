import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.6 — DateRangePicker. Two native date inputs side-by-side
// with an en-dash separator. Each input gets the same min / max bounds
// so the range stays inside the allowed window. Rich calendar grids are
// queued as a Stretch follow-up; the native pair covers the common case
// without taking on a date library.
export const dateRangePickerPropsSchema = z.object({
  start: z.string(),
  end: z.string(),
  min: z.string(),
  max: z.string(),
  disabled: z.boolean(),
})
export type DateRangePickerProps = z.infer<typeof dateRangePickerPropsSchema>

registerComponent<DateRangePickerProps>({
  id: 'date-range-picker',
  category: 'input',
  displayName: 'Date Range',
  tags: ['date', 'range', 'calendar', 'form'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: dateRangePickerPropsSchema,
  defaults: {
    props: { start: '', end: '', min: '', max: '', disabled: false },
    style: { classes: { root: 'inline-flex items-center gap-2' } },
  },
})
