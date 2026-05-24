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
      <Select value={defaultValue} disabled={disabled} onValueChange={() => {}}>
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
