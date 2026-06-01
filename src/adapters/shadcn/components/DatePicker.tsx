import { Input as ShadcnInputImpl } from '@/components/ui/input'
import type { DatePickerProps } from '@/registry/components/date-picker'
import { useIsEditing } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

// No-op so React stops warning about a value prop without onChange.
// User picks are intentionally inert — pickers are static previews
// until the host app wires real data binding.
const NOOP = () => {}

// shadcn DatePicker — native `<input type="date">` styled through the
// shadcn Input primitive.
//   • Editor mode: `readOnly` so the designer doesn't open a calendar
//     overlay every time they try to position the input.
//   • Runtime: drop `readOnly` so the native calendar UI opens on click
//     (Chrome / Edge suppress the picker when readOnly is set).
export function ShadcnDatePicker({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { value, min, max, disabled } = props as DatePickerProps
  const editing = useIsEditing()
  return (
    <ShadcnInputImpl
      ref={rootRef as never}
      type="date"
      value={value}
      min={min || undefined}
      max={max || undefined}
      disabled={disabled}
      readOnly={editing}
      onChange={NOOP}
      className={className}
      style={inlineStyle}
    />
  )
}
