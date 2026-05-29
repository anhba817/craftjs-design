import { Input as ShadcnInputImpl } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { DateRangePickerProps } from '@/registry/components/date-range-picker'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import type { AdapterRenderProps } from '../../types'

const NOOP = () => {}

// shadcn DateRangePicker — two native date inputs with an en-dash
// separator. Editor uses readOnly to suppress the calendar overlays;
// runtime drops it so both inputs open their pickers. Rich calendar UI
// (popover with month grid) is queued as a Stretch follow-up.
export function ShadcnDateRangePicker({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { start, end, min, max, disabled } = props as DateRangePickerProps
  const editing = useIsEditing()
  return (
    <div
      ref={rootRef}
      className={cn('inline-flex items-center gap-2', className)}
      style={inlineStyle}
    >
      <ShadcnInputImpl
        type="date"
        value={start}
        min={min || undefined}
        max={max || undefined}
        disabled={disabled}
        readOnly={editing}
        onChange={NOOP}
        aria-label="Start date"
      />
      <span aria-hidden className="text-muted-foreground">
        –
      </span>
      <ShadcnInputImpl
        type="date"
        value={end}
        min={min || undefined}
        max={max || undefined}
        disabled={disabled}
        readOnly={editing}
        onChange={NOOP}
        aria-label="End date"
      />
    </div>
  )
}
