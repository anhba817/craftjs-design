import { Textarea } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraTextareaImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { placeholder, value, rows, disabled } = props as {
    placeholder: string
    value: string
    rows: number
    disabled: boolean
  }
  return (
    <Textarea
      ref={rootRef as never}
      placeholder={placeholder}
      defaultValue={value}
      rows={rows}
      disabled={disabled}
      className={className}
      style={inlineStyle}
      readOnly
    />
  )
}
