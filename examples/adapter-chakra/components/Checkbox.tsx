import { Checkbox } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraCheckboxImpl({
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
    <Checkbox.Root
      ref={rootRef as never}
      checked={checked}
      disabled={disabled}
      className={className}
      style={inlineStyle}
      colorPalette="teal"
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
      {label ? <Checkbox.Label>{label}</Checkbox.Label> : null}
    </Checkbox.Root>
  )
}
