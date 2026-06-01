import TextField from '@mui/material/TextField'
import type { TimePickerProps } from '@/registry/components/time-picker'
import { useIsEditing } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

const NOOP = () => {}

// MUI TimePicker — TextField with `type="time"`. Editor uses readOnly
// to suppress the picker; runtime drops it so the native time wheel
// opens on click.
export function MaterialTimePicker({
  props,
  rootRef,
  sx,
  inlineStyle,
}: AdapterRenderProps) {
  const { value, min, max, disabled } = props as TimePickerProps
  const editing = useIsEditing()
  return (
    <TextField
      ref={rootRef as never}
      type="time"
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
