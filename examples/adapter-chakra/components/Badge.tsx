import { Badge } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

const INTENT_TO_PALETTE: Record<string, string> = {
  primary: 'teal',
  secondary: 'gray',
  success: 'green',
  warning: 'yellow',
  destructive: 'red',
}

export function ChakraBadgeImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent } = props as { label: string; intent: string }
  return (
    <Badge
      ref={rootRef as never}
      colorPalette={INTENT_TO_PALETTE[intent] ?? 'teal'}
      className={className}
      style={inlineStyle}
    >
      {label}
    </Badge>
  )
}
