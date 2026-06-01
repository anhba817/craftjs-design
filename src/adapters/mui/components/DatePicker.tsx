import TextField from '@mui/material/TextField'
import type { DatePickerProps } from '@/registry/components/date-picker'
import { useIsEditing } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

const NOOP = () => {}

// MUI DatePicker — TextField with `type="date"`. MUI's full X
// DatePicker ships in @mui/x-date-pickers with a date-library
// dependency; native input keeps adapter parity without it.
// Editor uses readOnly to suppress the calendar overlay; runtime drops
// it so the native picker opens on click.
export function MaterialDatePicker({
  props,
  rootRef,
  sx,
  inlineStyle,
}: AdapterRenderProps) {
  const { value, min, max, disabled } = props as DatePickerProps
  const editing = useIsEditing()
  return (
    <TextField
      ref={rootRef as never}
      type="date"
      value={value}
      onChange={NOOP}
      disabled={disabled}
      sx={sx}
      style={inlineStyle}
      slotProps={{
        input: { readOnly: editing },
        htmlInput: { min: min || undefined, max: max || undefined },
      }}
    />
  )
}
