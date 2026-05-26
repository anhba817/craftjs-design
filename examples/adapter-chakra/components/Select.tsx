import { NativeSelect } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

// Use Chakra v3's NativeSelect (a styled wrapper around a real <select>) —
// the compound `Select` requires a `collection` and a portal positioner,
// which adds setup boilerplate not worth it for this example. The native
// version is keyboard-accessible by default and renders inline.
export function ChakraSelectImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label: _label, options, selectedValue, disabled } = props as {
    label: string
    options: { value: string; label: string }[]
    selectedValue: string
    disabled: boolean
  }
  return (
    <NativeSelect.Root
      ref={rootRef as never}
      className={className}
      style={inlineStyle}
      disabled={disabled}
    >
      <NativeSelect.Field defaultValue={selectedValue}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  )
}
