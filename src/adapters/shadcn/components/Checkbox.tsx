import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

// Editor mode: onCheckedChange is a no-op so clicks don't toggle internal
// Radix state. The canonical's `checked` prop drives the visible state; users
// edit it via PropsPanel.
export function ShadcnCheckbox({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, checked, disabled } = props as {
    label: string
    checked: boolean
    disabled: boolean
  }
  return (
    <label
      ref={rootRef as never}
      className={cn('inline-flex items-center gap-2', className)}
      style={inlineStyle}
    >
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => {}} />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}
