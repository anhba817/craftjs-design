import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import type { AdapterRenderProps } from '../../types'

export function MaterialSelect({
  props,
  rootRef,
  sx,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, options, defaultValue, disabled } = props as {
    label: string
    options: { value: string; label: string }[]
    defaultValue: string
    disabled: boolean
  }
  return (
    <TextField
      ref={rootRef as never}
      select
      label={label}
      value={defaultValue}
      disabled={disabled}
      onChange={() => {}}
      sx={sx}
      style={inlineStyle}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  )
}
