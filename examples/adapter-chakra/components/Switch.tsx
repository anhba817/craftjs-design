import { Switch } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraSwitchImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, checked, disabled } = props as {
    label: string
    checked: boolean
    disabled: boolean
  }
  return (
    <Switch.Root
      ref={rootRef as never}
      checked={checked}
      disabled={disabled}
      className={className}
      style={inlineStyle}
      colorPalette="teal"
    >
      <Switch.HiddenInput />
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      {label ? <Switch.Label>{label}</Switch.Label> : null}
    </Switch.Root>
  )
}
