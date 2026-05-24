import TextField from '@mui/material/TextField'
import type { AdapterRenderProps } from '../../types'

export function MaterialTextarea({
  props,
  rootRef,
  sx,
  inlineStyle,
}: AdapterRenderProps) {
  const { placeholder, value, rows, disabled } = props as {
    placeholder: string
    value: string
    rows: number
    disabled: boolean
  }
  return (
    <TextField
      ref={rootRef as never}
      multiline
      placeholder={placeholder}
      value={value}
      rows={rows}
      disabled={disabled}
      slotProps={{ input: { readOnly: true } }}
      sx={sx}
      style={inlineStyle}
    />
  )
}
