import { Image } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

const ASPECT_RATIO_MAP: Record<string, string | undefined> = {
  auto: undefined,
  square: '1 / 1',
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '3:2': '3 / 2',
  '21:9': '21 / 9',
}

export function ChakraImageImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, alt, aspectRatio } = props as {
    src: string
    alt: string
    aspectRatio: string
  }
  const ar = ASPECT_RATIO_MAP[aspectRatio]
  return (
    <Image
      ref={rootRef as never}
      src={src}
      alt={alt}
      className={className}
      style={{ ...inlineStyle, ...(ar ? { aspectRatio: ar } : null) }}
      objectFit={ar ? 'cover' : undefined}
    />
  )
}
