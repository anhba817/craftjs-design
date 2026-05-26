import { Text } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraTextImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { content } = props as { content: string }
  return (
    <Text ref={rootRef as never} className={className} style={inlineStyle}>
      {content}
    </Text>
  )
}
