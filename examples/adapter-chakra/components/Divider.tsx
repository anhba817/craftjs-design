import { Separator } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

// Chakra v3 renamed `Divider` to `Separator`.
export function ChakraDividerImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { orientation } = props as { orientation: 'horizontal' | 'vertical' }
  return (
    <Separator
      ref={rootRef as never}
      orientation={orientation}
      className={className}
      style={inlineStyle}
    />
  )
}
