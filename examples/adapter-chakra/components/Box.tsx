import { Box as ChakraBox } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraBoxImpl({
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  return (
    <ChakraBox ref={rootRef as never} className={className} style={inlineStyle}>
      {children}
    </ChakraBox>
  )
}
