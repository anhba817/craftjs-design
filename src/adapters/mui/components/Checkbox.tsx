import MuiCheckbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import type { AdapterRenderProps } from '../../types'

export function MaterialCheckbox({
  props,
  rootRef,
  sx,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, checked, disabled } = props as {
    label: string
    checked: boolean
    disabled: boolean
  }
  return (
    <FormControlLabel
      ref={rootRef as never}
      control={
        <MuiCheckbox checked={checked} disabled={disabled} onChange={() => {}} />
      }
      label={label}
      sx={sx}
      style={inlineStyle}
    />
  )
}
