import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnSwitch({
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
      <Switch checked={checked} disabled={disabled} onCheckedChange={() => {}} />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}
