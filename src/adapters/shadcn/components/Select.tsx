import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@design/sdk'
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
  // Radix's <Select> root is a Provider — no DOM element to attach a ref to.
  // We attach rootRef to <SelectTrigger>, which renders the actual <button>.
  // Phase 9: under React 19 the trigger forwards refs via {...props} so no
  // display-contents wrapper is needed.
  //
  // Force `open={false}` in editor mode so clicking the trigger doesn't pop
  // open the Radix dropdown — the dropdown would yank focus and interrupt
  // the user's editing flow.
  return (
    <Select
      value={defaultValue}
      disabled={disabled}
      open={false}
      onOpenChange={() => {}}
      onValueChange={() => {}}
    >
      <SelectTrigger
        ref={rootRef as never}
        className={cn(className)}
        style={inlineStyle}
        aria-label={label}
      >
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
  )
}
