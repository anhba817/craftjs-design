import TextField from '@mui/material/TextField'
import { cn } from '@/lib/utils'
import type { DateRangePickerProps } from '@/registry/components/date-range-picker'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import type { AdapterRenderProps } from '../../types'

const NOOP = () => {}

// MUI DateRangePicker — two MUI TextField date inputs with an en-dash
// separator. MUI's rich X DateRangePicker ships in @mui/x-date-pickers
// (date-library dep); the native pair gets us cross-adapter parity
// without the dependency. Editor uses readOnly to suppress the
// calendars; runtime drops it so both inputs open their pickers.
export function MaterialDateRangePicker({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { start, end, min, max, disabled } = props as DateRangePickerProps
  const editing = useIsEditing()
  const slotPropsFor = (ariaLabel: string) => ({
    input: { readOnly: editing },
    htmlInput: {
      min: min || undefined,
      max: max || undefined,
      'aria-label': ariaLabel,
    },
  })
  return (
    <div
      ref={rootRef}
      className={cn('inline-flex items-center gap-2', className)}
      style={inlineStyle}
    >
      <TextField
        type="date"
        value={start}
        onChange={NOOP}
        disabled={disabled}
        slotProps={slotPropsFor('Start date')}
      />
      <span aria-hidden className="text-gray-500">
        –
      </span>
      <TextField
        type="date"
        value={end}
        onChange={NOOP}
        disabled={disabled}
        slotProps={slotPropsFor('End date')}
      />
    </div>
  )
}
