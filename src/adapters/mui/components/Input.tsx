import TextField from '@mui/material/TextField'
import type { AdapterRenderProps } from '../../types'

// MUI's TextField is the rich Input primitive (outlined border, focus ring,
// label support). Phase 3 uses the minimal shape — type, placeholder, value,
// disabled — without the optional label / helperText / error fields.
//
// readOnly via slotProps.input silences React's controlled-without-onChange
// warning AND prevents users from typing into the editor preview. Phase 4's
// inspector edits the canonical `value` prop directly.
export function MaterialInput({ props, rootRef, sx }: AdapterRenderProps) {
  const { type, placeholder, value, disabled } = props as {
    type: 'text' | 'email' | 'password' | 'number'
    placeholder: string
    value: string
    disabled: boolean
  }
  return (
    <TextField
      ref={rootRef as never}
      type={type}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      sx={sx}
      slotProps={{ input: { readOnly: true } }}
    />
  )
}
