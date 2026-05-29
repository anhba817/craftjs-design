import { Input as ShadcnInputImpl } from '@/components/ui/input'
import type { TimePickerProps } from '@/registry/components/time-picker'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import type { AdapterRenderProps } from '../../types'

const NOOP = () => {}

// shadcn TimePicker — native `<input type="time">` styled through the
// shadcn Input primitive. Editor uses readOnly to suppress the time
// wheel; runtime drops it so the picker opens.
export function ShadcnTimePicker({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { value, min, max, disabled } = props as TimePickerProps
  const editing = useIsEditing()
  return (
    <ShadcnInputImpl
      ref={rootRef as never}
      type="time"
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
