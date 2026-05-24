import FormControlLabel from '@mui/material/FormControlLabel'
import MuiSwitch from '@mui/material/Switch'
import type { AdapterRenderProps } from '../../types'

export function MaterialSwitch({
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
        <MuiSwitch checked={checked} disabled={disabled} onChange={() => {}} />
      }
      label={label}
      sx={sx}
      style={inlineStyle}
    />
  )
}
