import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

export function ShadcnRadio({
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
    <RadioGroup
      ref={rootRef as never}
      name={name}
      value={selectedValue}
      disabled={disabled}
      onValueChange={() => {}}
      className={cn('flex flex-col gap-2', className)}
      style={inlineStyle}
    >
      {options.map((o) => (
        <label key={o.value} className="inline-flex items-center gap-2">
          <RadioGroupItem value={o.value} disabled={disabled} />
          <span className="text-sm text-foreground">{o.label}</span>
        </label>
      ))}
    </RadioGroup>
  )
}
