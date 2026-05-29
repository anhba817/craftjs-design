import { cn } from '@/lib/utils'
import type { ImageProps } from '@/registry/components/image'
import { useShadcnTriggers } from '../triggers'
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
  const { src, alt, aspectRatio, triggers } = props as ImageProps
  const { onClick, wrap } = useShadcnTriggers(triggers)
  const hasTriggers = (triggers ?? []).length > 0
  return wrap(
    <img
      ref={rootRef as never}
      src={src}
      alt={alt}
      onClick={onClick}
      className={cn(
        ASPECT_CLASS[aspectRatio],
        'object-cover',
        hasTriggers && 'cursor-pointer',
        className,
      )}
      style={inlineStyle}
    />,
  )
}
