import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

// Editor mode: render the select as visually present but functionally inert.
// The trigger doesn't actually open a Radix Select dropdown — that would
// interrupt the editing flow. We render the closed-state trigger with the
// default value shown.
export function ShadcnSelect({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, options, defaultValue, disabled } = props as {
    label: string
    options: { value: string; label: string }[]
    defaultValue: string
    disabled: boolean
  }
  return (
    <span ref={rootRef} style={{ display: 'contents' }}>
      {/* Force `open={false}` in editor mode so clicking the trigger doesn't
          pop open the Radix dropdown — the dropdown would yank focus and
          interrupt the user's editing flow. The trigger is still visually
          present and Craft's connectors still see clicks for selection. */}
      <Select
        value={defaultValue}
        disabled={disabled}
        open={false}
        onOpenChange={() => {}}
        onValueChange={() => {}}
      >
        <SelectTrigger className={cn(className)} style={inlineStyle} aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}
