import { Avatar } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraAvatarImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, alt, fallback } = props as {
    src: string
    alt: string
    fallback: string
  }
  return (
    <Avatar.Root
      ref={rootRef as never}
      className={className}
      style={inlineStyle}
    >
      {src ? <Avatar.Image src={src} alt={alt} /> : null}
      <Avatar.Fallback>{fallback}</Avatar.Fallback>
    </Avatar.Root>
  )
}
