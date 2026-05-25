import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnTextarea({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { placeholder, value, rows, disabled } = props as {
    placeholder: string
    value: string
    rows: number
    disabled: boolean
  }
  return (
    <Textarea
      ref={rootRef as never}
      placeholder={placeholder}
      value={value}
      rows={rows}
      disabled={disabled}
      readOnly
      className={cn(className)}
      style={inlineStyle}
    />
  )
}
