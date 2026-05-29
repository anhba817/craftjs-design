import { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { ImageProps } from '@/registry/components/image'
import { useMuiTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

const ASPECT_VALUE: Record<string, string> = {
  auto: 'auto',
  square: '1 / 1',
  '16/9': '16 / 9',
}

// MUI doesn't have a dedicated Image primitive — use a plain <img>. The aspect
// ratio is applied via the CSS aspect-ratio property (inline style) since MUI's
// sx prop also accepts standard CSS properties.
export function MaterialImage({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, alt, aspectRatio, triggers } = props as ImageProps
  const anchorRef = useRef<HTMLImageElement | null>(null)
  const { onClick, wrap } = useMuiTriggers(triggers, anchorRef)
  const hasTriggers = (triggers ?? []).length > 0
  const aspect = ASPECT_VALUE[aspectRatio] ?? 'auto'
  return wrap(
    <img
      ref={(el) => {
        anchorRef.current = el
        if (typeof rootRef === 'function')
          (rootRef as (el: HTMLImageElement | null) => void)(el)
        else if (rootRef && 'current' in rootRef)
          (rootRef as React.MutableRefObject<HTMLImageElement | null>).current = el
      }}
      src={src}
      alt={alt}
      onClick={onClick}
      className={cn(hasTriggers && 'cursor-pointer', className)}
      style={{ aspectRatio: aspect, objectFit: 'cover', ...inlineStyle }}
    />,
  )
}
