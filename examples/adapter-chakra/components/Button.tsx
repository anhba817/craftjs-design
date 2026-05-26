import { Button } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

const INTENT_TO_VARIANT: Record<string, 'solid' | 'outline' | 'ghost'> = {
  primary: 'solid',
  secondary: 'outline',
  ghost: 'ghost',
}
const INTENT_TO_PALETTE: Record<string, string> = {
  primary: 'teal',
  secondary: 'gray',
  ghost: 'gray',
}

export function ChakraButtonImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent, disabled } = props as {
    label: string
    intent: 'primary' | 'secondary' | 'ghost'
    disabled: boolean
  }
  return (
    <Button
      ref={rootRef as never}
      className={className}
      style={inlineStyle}
      variant={INTENT_TO_VARIANT[intent] ?? 'solid'}
      colorPalette={INTENT_TO_PALETTE[intent] ?? 'teal'}
      disabled={disabled}
    >
      {label}
    </Button>
  )
}
