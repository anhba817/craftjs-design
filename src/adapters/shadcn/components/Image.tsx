import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

const ASPECT_CLASS: Record<string, string> = {
  auto: '',
  square: 'aspect-square',
  '16/9': 'aspect-video',
}

export function ShadcnImage({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, alt, aspectRatio } = props as {
    src: string
    alt: string
    aspectRatio: 'auto' | 'square' | '16/9'
  }
  return (
    <img
      ref={rootRef as never}
      src={src}
      alt={alt}
      className={cn(ASPECT_CLASS[aspectRatio], 'object-cover', className)}
      style={inlineStyle}
    />
  )
}
