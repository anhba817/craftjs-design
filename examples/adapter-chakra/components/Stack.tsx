import { Stack } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraStackImpl({
  props,
  rootRef,
  className,
  inlineStyle,
  children,
}: AdapterRenderProps) {
  const { direction, gap } = props as {
    direction: 'vertical' | 'horizontal'
    gap: string
  }
  return (
    <Stack
      ref={rootRef as never}
      direction={direction === 'horizontal' ? 'row' : 'column'}
      gap={gap}
      className={className}
      style={inlineStyle}
    >
      {children}
    </Stack>
  )
}
