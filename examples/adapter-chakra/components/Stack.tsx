import type { AdapterRenderProps } from '@design/sdk'
import { ChakraStack } from '../lib'

const GAP_PX: Record<string, number> = {
  '0': 0,
  '1': 4,
  '2': 8,
  '4': 16,
  '6': 24,
  '8': 32,
}

export function ChakraStackImpl({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { direction, gap } = props as {
    direction: 'vertical' | 'horizontal'
    gap: string
  }
  return (
    <ChakraStack
      ref={rootRef as never}
      className={className}
      style={inlineStyle}
      direction={direction === 'vertical' ? 'column' : 'row'}
      gap={GAP_PX[gap] ?? 8}
    >
      {children}
    </ChakraStack>
  )
}
