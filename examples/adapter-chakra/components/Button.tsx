import type { AdapterRenderProps } from '@design/sdk'
import { ChakraButton } from '../lib'

export function ChakraButtonImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent, disabled } = props as {
    label: string
    intent: 'primary' | 'secondary' | 'destructive'
    disabled: boolean
  }
  const variant = intent === 'secondary' ? 'outline' : 'solid'
  return (
    <ChakraButton
      ref={rootRef as never}
      className={className}
      style={inlineStyle}
      variant={variant}
      disabled={disabled}
    >
      {label}
    </ChakraButton>
  )
}
