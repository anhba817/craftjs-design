import FormControlLabel from '@mui/material/FormControlLabel'
import MuiRadio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import type { AdapterRenderProps } from '../../types'

export function MaterialRadio({
  props,
  rootRef,
  sx,
  inlineStyle,
}: AdapterRenderProps) {
  const { name, options, selectedValue, disabled } = props as {
    name: string
    options: { value: string; label: string }[]
    selectedValue: string
    disabled: boolean
  }
  return (
    <RadioGroup
      ref={rootRef as never}
      name={name}
      value={selectedValue}
      onChange={() => {}}
      sx={sx}
      style={inlineStyle}
    >
      {options.map((o) => (
        <FormControlLabel
          key={o.value}
          value={o.value}
          control={<MuiRadio disabled={disabled} />}
          label={o.label}
          disabled={disabled}
        />
      ))}
    </RadioGroup>
  )
}
