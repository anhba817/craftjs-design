import { RadioGroup, Stack } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraRadioImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { name, options, selectedValue, disabled } = props as {
    name: string
    options: { value: string; label: string }[]
    selectedValue: string
    disabled: boolean
  }
  return (
    <RadioGroup.Root
      ref={rootRef as never}
      name={name}
      value={selectedValue}
      disabled={disabled}
      className={className}
      style={inlineStyle}
      colorPalette="teal"
    >
      <Stack direction="column" gap="2">
        {options.map((opt) => (
          <RadioGroup.Item key={opt.value} value={opt.value}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemIndicator />
            <RadioGroup.ItemText>{opt.label}</RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </Stack>
    </RadioGroup.Root>
  )
}
