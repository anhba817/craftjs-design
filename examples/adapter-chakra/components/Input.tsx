import { Input } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraInputImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { type, placeholder, value, disabled } = props as {
    type: string
    placeholder: string
    value: string
    disabled: boolean
  }
  return (
    <Input
      ref={rootRef as never}
      type={type}
      placeholder={placeholder}
      defaultValue={value}
      disabled={disabled}
      className={className}
      style={inlineStyle}
      readOnly
    />
  )
}
