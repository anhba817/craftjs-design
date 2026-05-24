import type { AdapterRenderProps } from '@design/sdk'
import { ChakraBox } from '../lib'

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
